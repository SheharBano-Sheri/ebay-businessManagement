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

    
    // 1. Define the limit based on Role OR Plan
    let limit = 0;
    const isPublicVendor = user.role === 'public_vendor';

    if (isPublicVendor) {
      limit = 5; // Fixed limit for public vendors (No plan required)
    } else {
      // For standard users, check their membership plan
      const membershipPlan = user.membershipPlan || 'personal';
      const planLimits = {
        personal: 0,
        enterprise: 10,
        premium: Infinity
      };
      limit = planLimits[membershipPlan] || 0;
    }

    // 2. Check current usage
    const currentMemberCount = await TeamMember.countDocuments({ adminId, status: 'active' });
    
    // 3. Validate Limit
    if (currentMemberCount >= limit) {
      // Custom error for Public Vendor
      if (isPublicVendor) {
        return NextResponse.json({ 
          error: 'Public Vendors are limited to 5 active team members.' 
        }, { status: 403 });
      } 
      
      // Standard Plan errors
      const membershipPlan = user.membershipPlan || 'personal';
      if (membershipPlan === 'personal') {
        return NextResponse.json({ 
          error: 'Personal plan does not allow team members. Please upgrade to Enterprise or Premium plan.' 
        }, { status: 403 });
      } else if (membershipPlan === 'enterprise') {
        return NextResponse.json({ 
          error: 'Enterprise plan allows maximum 10 active team members. Please remove an existing member or upgrade to Premium plan.' 
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: `Your plan limit reached. Please contact support.` 
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
    const inviteLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/signup?token=${inviteToken}&email=${encodeURIComponent(email)}`;
    
    const emailResult = await sendTeamInvitationEmail({
      to: email,
      name: name,
      inviterName: user.name,
      inviterEmail: user.email,
      role: role || 'member',
      inviteToken: inviteToken
    });

    if (emailResult.success) {
      console.log('✅ Invitation email sent successfully to:', email);
      return NextResponse.json({ 
        message: 'Team member invited successfully! Invitation email sent.',
        member: newMember,
        inviteLink: inviteLink,
        emailSent: true
      }, { status: 201 });
    } else {
      console.error('❌ Failed to send invitation email:', emailResult.error);
      return NextResponse.json({ 
        message: 'Team member created but email failed to send. Share the link manually.',
        member: newMember,
        inviteLink: inviteLink,
        emailSent: false,
        emailError: emailResult.error
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Invite team member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}