import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';

export async function POST(request) {
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

    const body = await request.json();
    const { vendorId, action } = body;

    if (!vendorId || !action) {
      return NextResponse.json({ error: 'Missing vendorId or action' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (action === 'approve') {
      vendor.approvalStatus = 'approved';
      vendor.status = 'active';
      vendor.isActive = true;
    } else {
      vendor.approvalStatus = 'rejected';
      vendor.status = 'inactive';
      vendor.isActive = false;
    }

    vendor.updatedAt = new Date();
    await vendor.save();

    return NextResponse.json({
      message: `Vendor ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      vendor
    }, { status: 200 });

  } catch (error) {
    console.error('Approve vendor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
