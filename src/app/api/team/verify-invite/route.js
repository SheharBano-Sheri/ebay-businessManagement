import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TeamMember from '@/models/TeamMember';
import User from '@/models/User';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 });
    }

    await connectDB();

    const invitation = await TeamMember.findOne({ inviteToken: token, status: 'pending' });

    if (!invitation) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired invitation' }, { status: 404 });
    }

    // Get inviter details
    const inviter = await User.findById(invitation.adminId).select('name email');

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        inviterName: inviter?.name || inviter?.email || 'Team Admin',
        permissions: invitation.permissions
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Verify invite error:', error);
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 });
  }
}
