import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Vendor from '@/models/Vendor';
import TeamMember from '@/models/TeamMember';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const { email, password, name, accountType, membershipPlan, inviteToken } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if this is an invitation signup
    let invitation = null;
    
    if (inviteToken) {
      invitation = await TeamMember.findOne({ inviteToken, email, status: 'pending' });
      
      if (!invitation) {
        return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user account
    const userData = {
      email,
      password: hashedPassword,
      name,
      accountType: invitation ? 'user' : (accountType || 'user'),
      role: invitation ? 'team_member' : 'owner',
      membershipPlan: invitation ? 'invited' : (membershipPlan || 'personal'),
      membershipStart: new Date(),
      membershipEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      vendorApprovalStatus: 'approved'
    };
    
    // For team invitations, set admin and permissions
    if (invitation) {
      userData.adminId = invitation.adminId;
      userData.permissions = invitation.permissions || {};
    }
    
    const user = await User.create(userData);

    // If team invitation, activate it
    if (invitation) {
      invitation.status = 'active';
      invitation.acceptedAt = new Date();
      await invitation.save();
    }

    // If regular user (not team member), create virtual vendor
    if (!invitation && accountType === 'user') {
      await Vendor.create({
        name: `${name} (Self)`,
        vendorType: 'virtual',
        adminId: user._id,
        description: 'Virtual vendor for self-sourced products',
        isActive: true
      });
    }

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        accountType: user.accountType,
        role: user.role,
        membershipPlan: user.membershipPlan
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
    }
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        validationErrors: error.errors ? Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        })) : null
      },
      { status: 500 }
    );
  }
}
