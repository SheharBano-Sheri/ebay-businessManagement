// src/app/api/ebay/connect/route.js
//
// Initiates the eBay OAuth "User Consent" flow for a specific seller Account.
//
// Usage:
//   GET /api/ebay/connect?accountId=<mongoAccountId>
//
// The seller's browser is redirected to eBay's OAuth consent screen.
// After the seller grants access, eBay redirects back to /api/ebay/callback
// (the RuName callback URL) with an authorization_code.
//
// NOTE on domain: The Auth Accepted URL registered with eBay is:
//   https://www.geniebms.com/api/ebay/callback
//
// NOTE on CSRF: The `state` parameter is currently the plain accountId string.
// TODO: For hardened production, sign the state with a short-lived HMAC so
// a malicious redirect cannot inject a foreign accountId.

import { NextResponse }   from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions }    from '../../auth/[...nextauth]/route';
import connectDB          from '@/lib/mongodb';
import User               from '@/models/User';
import Account            from '@/models/Account';

// eBay OAuth authorization endpoint (production)
// TODO: swap to https://auth.sandbox.ebay.com/oauth2/authorize for sandbox testing
const EBAY_AUTH_URL = 'https://auth.ebay.com/oauth2/authorize';

// Required scopes for GenieBMS eBay integration
const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.finances',
].join(' ');

export async function GET(request) {
  try {
    // 1. Require an authenticated GenieBMS session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // 2. Look up the logged-in user to get their adminId
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const adminId = user.adminId || user._id;

    // 3. Validate the accountId param and confirm ownership
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId query parameter is required' },
        { status: 400 }
      );
    }

    const account = await Account.findOne({ _id: accountId, adminId });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // 4. Ensure required env vars are present
    const appId  = process.env.EBAY_APP_ID;
    const ruName = process.env.EBAY_RUNAME;

    if (!appId || !ruName) {
      console.error('Missing eBay env vars: EBAY_APP_ID or EBAY_RUNAME');
      return NextResponse.json(
        { error: 'eBay integration is not configured on this server. Contact your administrator.' },
        { status: 500 }
      );
    }

    // 5. Build the eBay authorization URL
    // state = accountId so the callback knows which Account to update.
    // TODO (CSRF hardening): sign the state with a short-lived HMAC before encoding.
    const params = new URLSearchParams({
      client_id:     appId,
      redirect_uri:  ruName,       // eBay uses the RuName as redirect_uri
      response_type: 'code',
      scope:         EBAY_SCOPES,
      state:         accountId,    // round-tripped back to /api/ebay/callback
    });

    const authUrl = `${EBAY_AUTH_URL}?${params.toString()}`;

    // 6. Redirect the seller's browser to eBay's consent screen
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('eBay connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error', technicalDetails: error.message },
      { status: 500 }
    );
  }
}
