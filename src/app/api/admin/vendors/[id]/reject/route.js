import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';
import User from '@/models/User';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const vendorId = params.id;
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Reject the vendor
    vendor.approvalStatus = 'rejected';
    vendor.isActive = false;
    vendor.status = 'rejected';
    await vendor.save();

    // If this is a public vendor with a linked user account, deactivate the user too
    if (vendor.publicVendorUserId) {
      const user = await User.findById(vendor.publicVendorUserId);
      if (user) {
        user.isActive = false;
        user.vendorApprovalStatus = 'rejected';
        await user.save();
      }
    }

    return NextResponse.json({ message: 'Vendor rejected', vendor }, { status: 200 });
  } catch (error) {
    console.error('Error rejecting vendor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
