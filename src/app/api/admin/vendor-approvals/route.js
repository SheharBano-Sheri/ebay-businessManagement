import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';

// GET - Fetch all pending public vendors for approval
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Master admin's ID is their own user ID, not adminId
    const masterAdminId = session.user.id;

    console.log('Fetching pending vendors for master admin:', masterAdminId);

    // First check all vendors
    const allVendors = await Vendor.find({ adminId: masterAdminId }).lean();
    console.log('Total vendors in database:', allVendors.length);
    console.log('Vendors breakdown:', allVendors.map(v => ({
      name: v.name,
      vendorType: v.vendorType,
      approvalStatus: v.approvalStatus,
      status: v.status
    })));

    // Fetch all unapproved public vendors WHO SIGNED UP THEMSELVES (have publicVendorUserId)
    const pendingVendors = await Vendor.find({
      adminId: masterAdminId,
      vendorType: 'public',
      approvalStatus: 'pending',
      publicVendorUserId: { $exists: true, $ne: null } // Only vendors who created their own account
    })
      .populate({
        path: 'publicVendorUserId',
        select: 'name email createdAt'
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${pendingVendors.length} pending public vendors`);

    // Enhance vendor data with user email if not already present
    const enhancedVendors = pendingVendors.map(vendor => ({
      ...vendor,
      email: vendor.email || vendor.publicVendorUserId?.email || '-'
    }));

    return NextResponse.json({ vendors: enhancedVendors }, { status: 200 });
  } catch (error) {
    console.error('Error fetching pending vendors:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch pending vendors',
      details: error.message 
    }, { status: 500 });
  }
}

// POST - Approve or reject vendor
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { vendorId, action, autoApproveInventory } = await request.json();

    if (!vendorId || !action) {
      return NextResponse.json({ 
        error: 'Vendor ID and action are required' 
      }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    console.log(`${action} vendor ${vendorId}, autoApproveInventory: ${autoApproveInventory}`);

    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // APPROVE: Update vendor approval status
      const updateData = {
        approvalStatus: 'approved',
        status: 'active',
        isActive: true
      };

      // Set auto-approve inventory flag
      if (autoApproveInventory !== undefined) {
        updateData.autoApproveInventory = autoApproveInventory;
      }

      await Vendor.findByIdAndUpdate(vendorId, { $set: updateData });

      // Update the associated user account
      if (vendor.publicVendorUserId) {
        const User = (await import('@/models/User')).default;
        await User.findByIdAndUpdate(
          vendor.publicVendorUserId,
          { 
            $set: { 
              isActive: true,
              vendorApprovalStatus: 'approved'
            } 
          }
        );
        console.log(`Approved user account ${vendor.publicVendorUserId}`);
      }

      return NextResponse.json({ 
        message: 'Vendor approved successfully',
        vendor: {
          id: vendor._id,
          name: vendor.name,
          approvalStatus: 'approved',
          autoApproveInventory: updateData.autoApproveInventory
        }
      }, { status: 200 });
    } else {
      // REJECT: Delete both the vendor and user account completely
      const User = (await import('@/models/User')).default;
      const Product = (await import('@/models/Product')).default;
      
      // Delete all products associated with this vendor
      if (vendor.publicVendorUserId) {
        await Product.deleteMany({ vendorId: vendorId });
        console.log(`Deleted all products for vendor ${vendorId}`);
        
        // Delete the user account
        await User.findByIdAndDelete(vendor.publicVendorUserId);
        console.log(`Deleted user account ${vendor.publicVendorUserId}`);
      }
      
      // Delete the vendor record
      await Vendor.findByIdAndDelete(vendorId);
      console.log(`Deleted vendor record ${vendorId}`);

      return NextResponse.json({ 
        message: 'Vendor rejected and account deleted',
        deleted: true
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error processing vendor:', error);
    return NextResponse.json({ 
      error: 'Failed to process vendor',
      details: error.message 
    }, { status: 500 });
  }
}
