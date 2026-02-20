import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
// Import Vendor to look up profiles
import Vendor from '@/models/Vendor';
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

    // For regular users (owner), adminId is their own ID
    // For team members, adminId is their admin's ID
    const adminId = session.user.adminId || session.user.id;
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

    // Visibility rules with approval status:
    if (session.user.role === 'master_admin') {
      // Master admin sees ALL products (including pending)
      console.log('Master admin - fetching all products');
    } else if (session.user.role === 'public_vendor') {
      // --- FIX: Public vendor sees products linked to their Vendor Profile ---
      // (Not just ones they added personally)
      
      const vendorProfile = await Vendor.findOne({ publicVendorUserId: session.user.id });
      
      if (vendorProfile) {
        query.vendorId = vendorProfile._id;
        console.log('Public vendor - fetching products for vendor ID:', vendorProfile._id);
      } else {
        // Fallback: If no vendor profile found (rare), fall back to addedBy
        query.addedBy = session.user.id;
        console.log('Public vendor (no profile) - fetching by addedBy');
      }
    } else {
      // Regular users see:
      // 1. Approved products (approvalStatus='approved') from public vendors they've added
      // 2. All products from their own private/virtual vendors
      
      if (vendorId) {
        // Viewing a specific vendor
        const vendor = await Vendor.findById(vendorId);
        
        if (vendor && vendor.vendorType === 'public') {
          // Public vendor - only show approved products
          // Also verify user has added this vendor
          const hasAddedVendor = vendor.addedByUsers && vendor.addedByUsers.includes(adminId);
          if (!hasAddedVendor) {
            // User hasn't added this vendor, return empty
            query._id = { $exists: false };
            console.log('Regular user - vendor not added, returning empty');
          } else {
            query.approvalStatus = 'approved';
            console.log('Regular user - fetching approved products from public vendor');
          }
        } else {
          // Private/virtual vendor - show all products from their admin
          query.adminId = adminId;
          console.log('Regular user - fetching products from private/virtual vendor');
        }
      } else {
        // Viewing all products
        // This is complex: we want approved public vendor products + all private/virtual vendor products
        
        // Get all vendors the user has added
        const userVendors = await Vendor.find({ 
          $or: [
            { adminId: adminId }, // Private/virtual vendors
            { addedByUsers: adminId, vendorType: 'public' } // Public vendors user has added
          ]
        }).select('_id vendorType');
        
        const vendorIds = userVendors.map(v => v._id);
        
        // Build query: show products from these vendors
        // BUT for public vendors, only approved products
        const publicVendorIds = userVendors.filter(v => v.vendorType === 'public').map(v => v._id);
        const privateVendorIds = userVendors.filter(v => v.vendorType !== 'public').map(v => v._id);
        
        query.$or = [];
        
        // Add private/virtual vendor products (no approval needed)
        if (privateVendorIds.length > 0) {
          query.$or.push({ vendorId: { $in: privateVendorIds } });
        }
        
        // Add approved public vendor products
        if (publicVendorIds.length > 0) {
          query.$or.push({ 
            vendorId: { $in: publicVendorIds },
            approvalStatus: 'approved'
          });
        }
        
        // If no vendors, return empty
        if (query.$or.length === 0) {
          query._id = { $exists: false }; // No results
        }
        
        console.log('Regular user - fetching products from all vendors with approval filtering');
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
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

// Inside src/app/api/products/route.js 

export async function POST(request) {
  try {
    const { authorized, user, error } = await checkPermission('inventory', 'edit');
    if (!authorized) return NextResponse.json({ error: error || 'Insufficient permissions to add products' }, { status: 403 });
    
    const session = await getServerSession(authOptions);
    await connectDB();
    const body = await request.json();

    // Include hasVariations and variations here
    const { country, sku, name, description, type, vendorId, stock, unitCost, currency, images, listingUrl, hasVariations, variations } = body;

    const adminId = session.user.adminId || session.user.id;
    
    if (!sku || !name || !vendorId) {
      return NextResponse.json({ error: 'Missing required fields: sku, name, vendorId' }, { status: 400 });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

    let isApproved = false;
    let approvedBy = null;
    let approvedAt = null;
    let approvalStatus = 'pending';

    if (session.user.role === 'master_admin' || vendor.vendorType === 'private' || vendor.vendorType === 'virtual') {
      isApproved = true;
      approvedBy = session.user.id;
      approvedAt = new Date();
      approvalStatus = 'approved';
    } else if (vendor.vendorType === 'public' && vendor.autoApproveInventory === true) {
      isApproved = true;
      approvedBy = session.user.id;
      approvedAt = new Date();
      approvalStatus = 'approved';
    } else if (vendor.vendorType === 'public') {
      isApproved = false;
      approvalStatus = 'pending';
    } else {
      isApproved = true;
      approvedBy = session.user.id;
      approvedAt = new Date();
      approvalStatus = 'approved';
    }

    const product = await Product.create({
      country, sku, name, description, type, listingUrl, adminId, vendorId,
      addedBy: session.user.id,
      stock: stock || 0,
      unitCost: unitCost || 0,
      currency: currency || 'USD',
      images: images || [],
      isActive: true,
      hasVariations: hasVariations || false,
      variations: variations || [],
      approvalStatus, isApproved, approvedBy, approvedAt
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}