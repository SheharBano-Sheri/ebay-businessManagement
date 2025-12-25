import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is master admin
    if (session.user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden - Master Admin only' }, { status: 403 });
    }

    await connectDB();

    // Get all pending public vendors
    const pendingVendors = await Vendor.find({
      vendorType: 'public',
      approvalStatus: 'pending'
    })
    .populate('publicVendorUserId', 'name email createdAt')
    .sort({ createdAt: -1 });

    return NextResponse.json({ vendors: pendingVendors }, { status: 200 });

  } catch (error) {
    console.error('Get pending vendors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
