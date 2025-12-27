import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Session from '@/models/Session';

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

    // Update last active time
    session.lastActive = new Date();
    await session.save();

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
