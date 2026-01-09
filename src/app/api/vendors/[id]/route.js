import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = params;
    const adminId = session.user.adminId || session.user.id;
    const isMasterAdmin = session.user.role === 'master_admin';

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Prevent deletion of virtual vendors (Self vendors for self-sourced products)
    if (vendor.vendorType === 'virtual') {
      return NextResponse.json({ 
        error: 'Virtual vendors (Self) cannot be deleted as they are core system vendors for self-sourced products' 
      }, { status: 403 });
    }

    // Check if this is a public vendor that the user added
    if (vendor.vendorType === 'public') {
      // Master admin can delete their own added public vendors, but should use hide instead
      if (isMasterAdmin && vendor.publicVendorUserId) {
        return NextResponse.json({ 
          error: 'Master admins should use hide/unhide for public vendors instead of deletion' 
        }, { status: 403 });
      }

      // Regular users can remove public vendors from their added list
      if (vendor.addedByUsers && vendor.addedByUsers.includes(adminId)) {
        vendor.addedByUsers = vendor.addedByUsers.filter(
          userId => userId.toString() !== adminId.toString()
        );
        await vendor.save();
        
        return NextResponse.json({ 
          message: 'Vendor removed from your account successfully'
        }, { status: 200 });
      } else {
        return NextResponse.json({ 
          error: 'You have not added this vendor' 
        }, { status: 403 });
      }
    }

    // For private/virtual vendors, check ownership
    if (vendor.adminId?.toString() !== adminId.toString()) {
      return NextResponse.json({ 
        error: 'You do not have permission to delete this vendor' 
      }, { status: 403 });
    }

    // Delete private/virtual vendor
    await Vendor.deleteOne({ _id: id });

    return NextResponse.json({ 
      message: 'Vendor deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Delete vendor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = params;
    const body = await request.json();
    const { action } = body; // 'hide' or 'unhide'
    
    const isMasterAdmin = session.user.role === 'master_admin';

    if (!isMasterAdmin) {
      return NextResponse.json({ 
        error: 'Only master admins can hide/unhide vendors' 
      }, { status: 403 });
    }

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (vendor.vendorType !== 'public') {
      return NextResponse.json({ 
        error: 'Only public vendors can be hidden' 
      }, { status: 400 });
    }

    if (action === 'hide') {
      vendor.isHidden = true;
      vendor.hiddenBy = session.user.id;
      vendor.hiddenAt = new Date();
      await vendor.save();
      
      return NextResponse.json({ 
        message: 'Vendor hidden successfully. Users will no longer see this vendor.',
        vendor
      }, { status: 200 });
    } else if (action === 'unhide') {
      vendor.isHidden = false;
      vendor.hiddenBy = null;
      vendor.hiddenAt = null;
      await vendor.save();
      
      return NextResponse.json({ 
        message: 'Vendor unhidden successfully. Users can now see this vendor.',
        vendor
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Use "hide" or "unhide"' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Hide/Unhide vendor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
