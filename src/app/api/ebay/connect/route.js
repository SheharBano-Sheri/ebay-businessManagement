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
// SECURITY — CSRF / state-nonce binding:
//   A cryptographically random 32-byte nonce is generated on every connect
//   attempt and stored on the Account document (oauthStateNonce) with a
//   15-minute expiry. The nonce is included in the `state` parameter sent to
//   eBay as "<accountId>.<nonce>". The callback route verifies the nonce
//   matches the stored value and has not expired before writing any tokens.
//   This prevents:
//     • State-fixation / CSRF: an attacker cannot inject a foreign accountId
//       because they cannot predict or forge the nonce.
//     • Silent eBay session re-use confusion: each connect click produces a
//       fresh nonce, so a stale callback from a previous attempt is rejected.

import crypto               from 'crypto';
import { NextResponse }     from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions }      from '../../auth/[...nextauth]/route';
import connectDB            from '@/lib/mongodb';
import User                 from '@/models/User';
import Account              from '@/models/Account';

// eBay OAuth authorization endpoint (production)
// TODO: swap to https://auth.sandbox.ebay.com/oauth2/authorize for sandbox testing
const EBAY_AUTH_URL = 'https://auth.ebay.com/oauth2/authorize';

// Required scopes for GenieBMS eBay integration
const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.finances',
].join(' ');

// Nonce lifetime: 15 minutes.
// Must be long enough to survive slow eBay consent screens; short enough to
// limit the window for a replayed callback.
const NONCE_TTL_MS = 15 * 60 * 1000;

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

    // 5. Generate a per-attempt cryptographic nonce and persist it on the Account.
    //    The callback route will verify this nonce before writing any tokens.
    //    The nonce is single-use: the callback clears it after a successful exchange.
    const nonce    = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

    await Account.findByIdAndUpdate(accountId, {
      oauthStateNonce:          nonce,
      oauthStateNonceExpiresAt: expiresAt,
    });

    console.log(
      `eBay connect initiated for accountId=${accountId}, nonce stored, expires=${expiresAt.toISOString()}`
    );

    // 6. Build the eBay authorization URL.
    //    state = "<accountId>.<nonce>" — the callback parses both halves.
    //
    //    prompt=login forces eBay to ALWAYS show the login screen, even when
    //    the seller's browser already has an active eBay session.
    //    Without this, eBay silently reuses the current browser session —
    //    making it impossible to connect a DIFFERENT eBay seller account
    //    (e.g. "sheri" while "Umair" is already logged in). Every Connect
    //    click must ask "which eBay account do you want to link?" explicitly.
    const state  = `${accountId}.${nonce}`;
    const params = new URLSearchParams({
      client_id:     appId,
      redirect_uri:  ruName,        // eBay uses the RuName as redirect_uri
      response_type: 'code',
      scope:         EBAY_SCOPES,
      state,                        // round-tripped back to /api/ebay/callback
      prompt:        'login',       // always show eBay login — never silently reuse browser session
    });

    const authUrl = `${EBAY_AUTH_URL}?${params.toString()}`;

    // 7. Redirect the seller's browser to eBay's consent screen
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('eBay connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error', technicalDetails: error.message },
      { status: 500 }
    );
  }
}
