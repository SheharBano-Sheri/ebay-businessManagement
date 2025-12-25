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

    await connectDB();

    const userId = session.user.id;

    // Find the public vendor account for this user
    const vendor = await Vendor.findOne({ 
      publicVendorUserId: userId,
      vendorType: 'public'
    });

    if (!vendor) {
      return NextResponse.json({ 
        followerCount: 0,
        message: 'No vendor account found' 
      }, { status: 200 });
    }

    const followerCount = vendor.addedByUsers?.length || 0;

    return NextResponse.json({ 
      followerCount,
      vendorName: vendor.name,
      message: followerCount === 0 
        ? 'No users have added you as a vendor yet' 
        : `${followerCount} ${followerCount === 1 ? 'user has' : 'users have'} added you as a vendor`
    }, { status: 200 });

  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
