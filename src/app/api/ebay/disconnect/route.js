// src/app/api/ebay/disconnect/route.js
//
// Disconnects an eBay integration by clearing stored OAuth tokens for an Account.
//
// POST /api/ebay/disconnect
// Body: { accountId: string }

import { NextResponse }   from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions }    from '../../auth/[...nextauth]/route';
import connectDB          from '@/lib/mongodb';
import User               from '@/models/User';
import Account            from '@/models/Account';

export async function POST(request) {
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { accountId } = body;
    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    const account = await Account.findOne({ _id: accountId, adminId });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Clear all stored eBay tokens and status flags.
    // needsReconnect and ebayLastSyncedAt are reset so the UI shows a clean
    // "Not Connected" state rather than stale Phase 3/4 indicators.
    account.ebayRefreshToken      = null;
    account.ebayAccessToken       = null;
    account.ebayAccessTokenExpiry = null;
    account.ebayConnectedAt       = null;
    account.needsReconnect        = false;
    account.ebayLastSyncedAt      = null;
    account.updatedAt             = new Date();
    await account.save();

    return NextResponse.json({
      success: true,
      message: 'eBay account disconnected successfully',
      account,
    });
  } catch (error) {
    console.error('Error disconnecting eBay account:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect eBay account: ' + error.message },
      { status: 500 }
    );
  }
}
