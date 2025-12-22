import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';
import User from '@/models/User';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 });
    }

    await connectDB();

    const vendor = await Vendor.findOne({ inviteToken: token, status: 'pending' });

    if (!vendor) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired invitation' }, { status: 404 });
    }

    // Get inviter details
    const inviter = await User.findById(vendor.invitedBy).select('name email');

    return NextResponse.json({
      valid: true,
      invitation: {
        email: vendor.email,
        name: vendor.contactName || vendor.name,
        businessName: vendor.name,
        inviterName: inviter?.name || inviter?.email || 'Business Owner',
        description: vendor.description
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Verify vendor invite error:', error);
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 });
  }
}
