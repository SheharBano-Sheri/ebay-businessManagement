import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import Vendor from '@/models/Vendor';

// GET - Fetch all pending products for approval
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    console.log('Fetching pending products from public vendors for master admin');

    // Fetch ALL unapproved products from PUBLIC vendors only
    // First, get all public vendors
    const publicVendors = await Vendor.find({ vendorType: 'public' }).select('_id');
    const publicVendorIds = publicVendors.map(v => v._id);

    const pendingProducts = await Product.find({
      approvalStatus: 'pending',
      isActive: true,
      vendorId: { $in: publicVendorIds } // Only public vendor products
    })
      .populate({
        path: 'vendorId',
        select: 'name vendorType approvalStatus status autoApproveInventory'
      })
      .populate({
        path: 'addedBy',
        select: 'name email'
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${pendingProducts.length} pending products from public vendors`);

    return NextResponse.json({ products: pendingProducts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching pending products:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Failed to fetch pending products',
      details: error.message 
    }, { status: 500 });
  }
}

// POST - Approve or reject products
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { productIds, action } = await request.json();

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'Product IDs are required' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    console.log(`${action} products:`, productIds);

    if (action === 'approve') {
      // Approve selected products
      await Product.updateMany(
        { _id: { $in: productIds } },
        {
          $set: {
            isApproved: true,
            approvalStatus: 'approved',
            approvedBy: session.user.id,
            approvedAt: new Date()
          }
        }
      );

      return NextResponse.json({ 
        message: `${productIds.length} product(s) approved successfully` 
      }, { status: 200 });
    } else {
      // Reject = mark as rejected and deactivate
      await Product.updateMany(
        { _id: { $in: productIds } },
        {
          $set: {
            isActive: false,
            approvalStatus: 'rejected'
          }
        }
      );

      return NextResponse.json({ 
        message: `${productIds.length} product(s) rejected successfully` 
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error processing products:', error);
    return NextResponse.json({ 
      error: 'Failed to process products',
      details: error.message 
    }, { status: 500 });
  }
}

// PATCH - Toggle auto-approve for a vendor
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { vendorId, autoApproveInventory } = await request.json();

    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID is required' }, { status: 400 });
    }

    console.log(`Toggling auto-approve for vendor ${vendorId} to ${autoApproveInventory}`);

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { autoApproveInventory } },
      { new: true }
    );

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Auto-approve setting updated',
      autoApproveInventory: vendor.autoApproveInventory
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json({ 
      error: 'Failed to update vendor',
      details: error.message 
    }, { status: 500 });
  }
}
