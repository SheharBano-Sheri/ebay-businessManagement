import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { checkPermission } from '@/lib/permissions';

export async function GET(request) {
  try {
    // Check permission
    const { authorized, user, error } = await checkPermission('inventory', 'view');
    
    if (!authorized) {
      return NextResponse.json({ error: error || 'Insufficient permissions' }, { status: 403 });
    }
    
    const session = await getServerSession(authOptions);

    await connectDB();

    const adminId = session.user.adminId;
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    console.log('Fetching products for user:', { 
      userId: session.user.id, 
      role: session.user.role, 
      adminId,
      vendorId 
    });

    // Build query based on user role and filters
    let query = { isActive: true };
    
    // Don't filter by adminId initially - we'll handle it per role
    if (vendorId) {
      query.vendorId = vendorId;
    }

    // Simple visibility rules:
    if (session.user.role === 'master_admin') {
      // Master admin sees ALL products
      console.log('Master admin - fetching all products');
    } else if (session.user.role === 'public_vendor') {
      // Public vendor sees only their own products
      query.addedBy = session.user.id;
      console.log('Public vendor - fetching own products');
    } else {
      // Regular users see only approved products
      // For public vendors: approved products are visible to all who added the vendor
      // For private/virtual vendors: only from their own adminId
      query.isApproved = true;
      
      if (vendorId) {
        // If viewing a specific vendor, check if it's public or private
        const Vendor = (await import('@/models/Vendor')).default;
        const vendor = await Vendor.findById(vendorId);
        
        if (vendor && vendor.vendorType === 'public') {
          // Public vendor - don't filter by adminId
          console.log('Regular user - fetching approved products from public vendor');
        } else {
          // Private/virtual vendor - filter by adminId
          query.adminId = adminId;
          console.log('Regular user - fetching approved products from private/virtual vendor');
        }
      } else {
        // Viewing all products - need to show approved from public + own private/virtual
        console.log('Regular user - fetching all approved products');
        // Don't add adminId filter here - we want approved public vendor products too
      }
    }

    const products = await Product.find(query)
      .populate({
        path: 'vendorId',
        select: 'name vendorType'
      })
      .populate({
        path: 'addedBy',
        select: 'name email'
      })
      .populate({
        path: 'approvedBy',
        select: 'name email'
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${products.length} products`);
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Get products error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Check permission - need 'edit' for POST
    const { authorized, user, error } = await checkPermission('inventory', 'edit');
    
    if (!authorized) {
      return NextResponse.json({ error: error || 'Insufficient permissions to add products' }, { status: 403 });
    }
    
    const session = await getServerSession(authOptions);

    await connectDB();
    const body = await request.json();

    const { country, sku, name, description, type, vendorId, stock, unitCost, currency, images, listingUrl } = body;

    console.log('Creating product with data:', { sku, name, vendorId, adminId: session.user.adminId });

    if (!sku || !name || !vendorId) {
      return NextResponse.json({ error: 'Missing required fields: sku, name, vendorId' }, { status: 400 });
    }

    const adminId = session.user.adminId;
    
    if (!adminId) {
      console.error('No adminId found in session:', session.user);
      return NextResponse.json({ error: 'Admin ID not found in session' }, { status: 400 });
    }

    // Check if vendor exists and get its properties
    const Vendor = (await import('@/models/Vendor')).default;
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      console.error('Vendor not found:', vendorId);
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    console.log('Vendor found:', { id: vendor._id, type: vendor.vendorType, autoApprove: vendor.autoApproveInventory, approvalStatus: vendor.approvalStatus });
    
    let isApproved = false;
    let approvedBy = null;
    let approvedAt = null;

    // Auto-approve logic:
    if (vendor.autoApproveInventory === true) {
      isApproved = true;
      approvedBy = session.user.id;
      approvedAt = new Date();
      console.log('Product auto-approved: vendor has auto-approve enabled');
    } else if (vendor.vendorType === 'private' || vendor.vendorType === 'virtual') {
      // Private and virtual vendors auto-approve
      isApproved = true;
      approvedBy = session.user.id;
      approvedAt = new Date();
      console.log('Product auto-approved: private/virtual vendor');
    } else {
      console.log('Product requires manual approval');
    }

    const product = await Product.create({
      country,
      sku,
      name,
      description,
      type,
      listingUrl,
      adminId,
      vendorId,
      addedBy: session.user.id,
      stock: stock || 0,
      unitCost: unitCost || 0,
      currency: currency || 'USD',
      images: images || [],
      isActive: true,
      isApproved,
      approvedBy,
      approvedAt
    });

    console.log('Product created successfully:', product._id);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
