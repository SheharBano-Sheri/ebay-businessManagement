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
    if (!email || !password || !name || !accountType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if this is an invitation signup
    let invitation = null;
    let vendorInvite = null;
    
    if (inviteToken) {
      // Check if it's a team invitation
      invitation = await TeamMember.findOne({ inviteToken, email, status: 'pending' });
      
      // If not team, check if it's a vendor invitation
      if (!invitation) {
        vendorInvite = await Vendor.findOne({ inviteToken, email, status: 'pending' });
      }
      
      if (!invitation && !vendorInvite) {
        return NextResponse.json(
          { error: 'Invalid or expired invitation' },
          { status: 400 }
        );
      }
    }

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      accountType: vendorInvite ? 'public_vendor' : (invitation ? 'user' : accountType),
      role: vendorInvite ? 'public_vendor' : (invitation ? invitation.role : (accountType === 'public_vendor' ? 'public_vendor' : 'owner')),
      membershipPlan: (invitation || vendorInvite) ? 'invited' : (accountType === 'public_vendor' ? 'personal' : membershipPlan || 'personal'),
      adminId: invitation ? invitation.adminId : null,
      membershipStart: new Date(),
      membershipEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    });

    // If team invitation, update team member status
    if (invitation) {
      invitation.status = 'active';
      invitation.acceptedAt = new Date();
      await invitation.save();
    }
    
    // If vendor invitation, update vendor status
    if (vendorInvite) {
      vendorInvite.status = 'active';
      vendorInvite.isActive = true;
      vendorInvite.publicVendorUserId = user._id;
      await vendorInvite.save();
    }

    // If account type is user, create a virtual vendor
    if (accountType === 'user') {
      await Vendor.create({
        name: `${name} (Self)`,
        vendorType: 'virtual',
        adminId: user._id,
        description: 'Virtual vendor for self-sourced products',
        isActive: true
      });
    }

    // If account type is public vendor, create public vendor entry
    if (accountType === 'public_vendor') {
      await Vendor.create({
        name: name,
        email: email,
        vendorType: 'public',
        publicVendorUserId: user._id,
        description: 'Public marketplace vendor',
        isActive: true
      });
    }

    return NextResponse.json({
      message: 'User created successfully',
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
