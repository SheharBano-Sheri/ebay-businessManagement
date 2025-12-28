import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';
import User from '@/models/User';
import { sendVendorInvitationEmail } from '@/lib/email';

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

    const { email, name, businessName, description } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    // Check if vendor already exists with this email
    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return NextResponse.json({ error: 'Vendor with this email already exists' }, { status: 400 });
    }

    // Generate unique invite token
    const inviteToken = require('crypto').randomBytes(32).toString('hex');

    const newVendor = await Vendor.create({
      name: businessName || name,
      email,
      Name: name,
      vendorType: 'public',
      status: 'pending',
      inviteToken,
      description: description || '',
      invitedBy: adminId,
      isActive: false
    });

    console.log('Vendor invited:', newVendor._id);

    // Send invitation email
    const emailResult = await sendVendorInvitationEmail({
      to: email,
      name,
      businessName: businessName || name,
      inviterName: user.name || session.user.name || session.user.email,
      inviterEmail: session.user.email,
      inviteToken
    });

    if (!emailResult.success) {
      console.error('Failed to send vendor invitation email:', emailResult.error);
    }

    return NextResponse.json({ 
      message: 'Vendor invited successfully. An invitation email has been sent.',
      vendor: newVendor,
      emailSent: emailResult.success
    }, { status: 201 });

  } catch (error) {
    console.error('Invite vendor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
