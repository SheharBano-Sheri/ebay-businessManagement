import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = params.id;
    const body = await request.json();
    const { block } = body;

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't allow blocking master admins
    if (user.role === 'master_admin') {
      return NextResponse.json({ error: 'Cannot block master admin' }, { status: 400 });
    }

    // Block or unblock the user
    user.isActive = !block;
    await user.save();

    return NextResponse.json({ 
      message: block ? 'User blocked successfully' : 'User unblocked successfully', 
      user 
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
