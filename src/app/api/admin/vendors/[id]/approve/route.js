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

    // Approve the vendor
    vendor.approvalStatus = 'approved';
    vendor.isActive = true;
    vendor.status = 'active';
    await vendor.save();

    // If this is a public vendor with a linked user account, activate the user too
    if (vendor.publicVendorUserId) {
      const user = await User.findById(vendor.publicVendorUserId);
      if (user) {
        user.isActive = true;
        user.vendorApprovalStatus = 'approved';
        await user.save();
      }
    }

    return NextResponse.json({ message: 'Vendor approved successfully', vendor }, { status: 200 });
  } catch (error) {
    console.error('Error approving vendor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
