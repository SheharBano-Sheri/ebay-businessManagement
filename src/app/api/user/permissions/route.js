import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// This endpoint returns fresh user data from the database
// Used to check if permissions have changed since login
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Fetch fresh user data
    const user = await User.findOne({ email: session.user.email })
      .select('role permissions accountType membershipPlan adminId')
      .lean();
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      role: user.role,
      permissions: user.permissions || {},
      accountType: user.accountType,
      membershipPlan: user.membershipPlan,
      adminId: user.adminId
    }, { status: 200 });

  } catch (error) {
    console.error('Get fresh permissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
