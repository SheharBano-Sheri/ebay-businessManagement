import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Session from '@/models/Session';
import User from '@/models/User';

export async function POST(request) {
  try {
    const { sessionToken, userId } = await request.json();

    if (!sessionToken || !userId) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    await connectDB();

    const session = await Session.findOne({
      sessionToken,
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    // Check if user is still active (not blocked)
    const user = await User.findById(userId).select('isActive');
    
    if (!user || !user.isActive) {
      // User has been blocked - invalidate the session
      session.isActive = false;
      await session.save();
      return NextResponse.json({ valid: false, reason: 'User blocked' }, { status: 401 });
    }

    // Update last active time
    session.lastActive = new Date();
    await session.save();

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
