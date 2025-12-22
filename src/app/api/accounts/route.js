import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Account from '@/models/Account';
import User from '@/models/User';

// GET all accounts for the logged-in admin
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    console.log('MongoDB connected for GET accounts');

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the admin ID (if user is a team member, get their admin's ID)
    const adminId = user.adminId || user._id;
    console.log('Fetching accounts for adminId:', adminId);

    const accounts = await Account.find({ adminId }).sort({ createdAt: -1 });
    console.log('Found accounts:', accounts.length);

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts: ' + error.message }, { status: 500 });
  }
}

// POST create a new account
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    console.log('MongoDB connected for POST account');

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const adminId = user.adminId || user._id;
    const body = await request.json();
    console.log('Creating account with data:', body, 'for adminId:', adminId);

    // Check plan limits
    if (user.membershipPlan === 'Personal') {
      const existingAccounts = await Account.countDocuments({ adminId });
      if (existingAccounts >= 1) {
        return NextResponse.json(
          { error: 'Personal plan allows only 1 account. Upgrade to Pro or Enterprise.' },
          { status: 403 }
        );
      }
    }

    const account = new Account({
      ...body,
      adminId,
      updatedAt: new Date()
    });

    const savedAccount = await account.save();
    console.log('Account saved successfully:', savedAccount._id);

    return NextResponse.json({ account: savedAccount }, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: 'Failed to create account: ' + error.message }, { status: 500 });
  }
}

// PUT update an account
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const adminId = user.adminId || user._id;
    const body = await request.json();
    const { _id, ...updateData } = body;

    if (!_id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const account = await Account.findOneAndUpdate(
      { _id, adminId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}

// DELETE an account
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('id');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const adminId = user.adminId || user._id;

    const account = await Account.findOneAndDelete({ _id: accountId, adminId });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
