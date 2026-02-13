import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';
import User from '@/models/User';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Fetch all vendors with their user information if they're public vendors
    const vendors = await Vendor.find({})
      .populate('publicVendorUserId', 'name email membershipPlan')
      .sort({ createdAt: -1 })
      .lean();

    // Enrich vendors with user email if not present
    const enrichedVendors = vendors.map(vendor => {
      if (vendor.publicVendorUserId && !vendor.email) {
        return {
          ...vendor,
          email: vendor.publicVendorUserId.email,
          membershipPlan: vendor.publicVendorUserId.membershipPlan
        };
      }
      return vendor;
    });

    return NextResponse.json({ vendors: enrichedVendors }, { status: 200 });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
