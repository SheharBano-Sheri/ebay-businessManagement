import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import TeamMember from '@/models/TeamMember';
import User from '@/models/User';
import { sendTeamInvitationEmail } from '@/lib/email';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const adminId = session.user.adminId || session.user.id;

    const members = await TeamMember.find({ adminId })
      .select('name email role status permissions createdAt')
      .sort({ createdAt: -1 });

    return NextResponse.json({ members }, { status: 200 });

  } catch (error) {
    console.error('Get team members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const adminId = session.user.adminId || session.user.id;
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check plan limits
    const membershipPlan = user.membershipPlan || 'personal';
    const planLimits = {
      personal: 0,
      pro: 10,
      enterprise: Infinity
    };

    const currentMemberCount = await TeamMember.countDocuments({ adminId });
    
    if (currentMemberCount >= planLimits[membershipPlan]) {
      return NextResponse.json({ 
        error: `Your ${membershipPlan} plan allows maximum ${planLimits[membershipPlan]} team members. Please upgrade your plan.` 
      }, { status: 403 });
    }

    const { email, name, role, permissions } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    // Check if member already exists
    const existingMember = await TeamMember.findOne({ adminId, email });
    if (existingMember) {
      return NextResponse.json({ error: 'Team member already exists' }, { status: 400 });
    }

    // Use provided permissions or set defaults based on role
    const defaultPermissions = {
      orders: role === 'admin' || role === 'manager' ? ['view', 'edit'] : ['view'],
      inventory: role === 'admin' || role === 'manager' ? ['view', 'edit'] : ['view'],
      vendors: role === 'admin' ? ['view', 'edit'] : ['view'],
      accounts: role === 'admin' ? ['view', 'edit'] : ['view'],
      payments: role === 'admin' || role === 'manager' ? ['view'] : []
    };

    // Generate unique invite token
    const inviteToken = require('crypto').randomBytes(32).toString('hex');

    const newMember = await TeamMember.create({
      adminId,
      email,
      name,
      role: role || 'member',
      status: 'pending',
      inviteToken,
      permissions: permissions || defaultPermissions
    });

    console.log('Team member created:', newMember._id);

    // Send invitation email
    const emailResult = await sendTeamInvitationEmail({
      to: email,
      name,
      inviterName: user.name || session.user.name || session.user.email,
      inviterEmail: session.user.email,
      role: role || 'member',
      inviteToken
    });

    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({ 
      message: 'Team member invited successfully. An invitation email has been sent.',
      member: newMember,
      emailSent: emailResult.success
    }, { status: 201 });

  } catch (error) {
    console.error('Invite team member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
