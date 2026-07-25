// src/app/api/ebay/callback/route.js
//
// eBay OAuth callback handler.
//
// Called by eBay after the seller grants (or declines) consent on eBay's
// authorization page. eBay redirects here with:
//   ?code=<authorizationCode>&state=<accountId>.<nonce>   (consent granted)
//   ?error=access_denied&state=<accountId>.<nonce>         (consent declined)
//
// On success, this route:
//   1. Parses accountId and nonce from the `state` parameter
//   2. Loads the Account and verifies the nonce matches the stored value
//      and has not expired — rejects any callback that fails this check
//   3. Exchanges the authorization code for access + refresh tokens
//   4. Stores the refresh token (and initial access token) on the Account
//   5. Clears the nonce fields (single-use) to prevent replay
//   6. Redirects the seller's browser to the dashboard with a success notice
//
// On failure / denial:
//   Redirects to /dashboard/accounts with an error query param.
//
// Registered callback URLs in the eBay developer portal RuName:
//   Auth accepted URL: https://www.geniebms.com/api/ebay/callback
//   Auth declined URL: https://www.geniebms.com/login

import { NextResponse }     from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions }      from '../../auth/[...nextauth]/route';
import connectDB            from '@/lib/mongodb';
import User                 from '@/models/User';
import Account              from '@/models/Account';
import { exchangeCodeForTokens } from '@/lib/ebayFinancesApi';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code       = searchParams.get('code');
  const stateRaw   = searchParams.get('state');   // "<accountId>.<nonce>", set in /api/ebay/connect
  const oauthError = searchParams.get('error');   // present when seller declined consent

  // --- Seller declined consent ---
  if (oauthError) {
    console.warn('eBay OAuth declined by seller:', oauthError);
    // Redirect to login (matches the "Auth declined URL" in eBay dev portal)
    return NextResponse.redirect(
      new URL('/login?ebay_error=access_denied', request.url)
    );
  }

  // --- Missing required params ---
  if (!code || !stateRaw) {
    return NextResponse.json(
      { error: 'Missing authorization code or state parameter from eBay callback.' },
      { status: 400 }
    );
  }

  // --- Parse state: "<accountId>.<nonce>" ---
  // The nonce itself is a 64-char hex string (32 bytes); accountId is a 24-char
  // MongoDB ObjectId. We split on the FIRST dot only so neither can contain a
  // dot that would confuse parsing (ObjectIds never contain dots).
  const dotIndex  = stateRaw.indexOf('.');
  if (dotIndex === -1) {
    console.error('eBay callback: state parameter missing dot separator — possible old or tampered state:', stateRaw);
    return NextResponse.redirect(
      new URL('/dashboard/accounts?ebay_error=invalid_state', request.url)
    );
  }
  const accountId    = stateRaw.slice(0, dotIndex);
  const receivedNonce = stateRaw.slice(dotIndex + 1);

  if (!accountId || !receivedNonce) {
    return NextResponse.redirect(
      new URL('/dashboard/accounts?ebay_error=invalid_state', request.url)
    );
  }

  try {
    // 1. Require an authenticated GenieBMS session.
    //    The seller must have been logged in when they initiated the OAuth flow.
    const session = await getServerSession(authOptions);
    if (!session) {
      // Session may have expired during the eBay consent screen — send them to login
      return NextResponse.redirect(
        new URL('/login?ebay_error=session_expired', request.url)
      );
    }

    await connectDB();

    // 2. Look up the logged-in user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const adminId = user.adminId || user._id;

    // 3. Load the Account and verify ownership
    const account = await Account.findOne({ _id: accountId, adminId });
    if (!account) {
      console.error(`eBay callback: account ${accountId} not found for adminId ${adminId}`);
      return NextResponse.redirect(
        new URL('/dashboard/accounts?ebay_error=account_not_found', request.url)
      );
    }

    // 4. Nonce verification — the core CSRF / state-fixation guard.
    //
    //    Rules:
    //    a) The Account MUST have a stored nonce (one was set by /api/ebay/connect).
    //    b) The stored nonce MUST match what eBay echoed back in `state`.
    //    c) The nonce MUST not have expired (15-minute window).
    //
    //    Any failure here means this callback was not produced by the most recent
    //    legitimate connect attempt for this account, and we refuse to write tokens.

    if (!account.oauthStateNonce || !account.oauthStateNonceExpiresAt) {
      console.error(
        `eBay callback REJECTED — no pending nonce on account ${accountId}. ` +
        'Possible replay of an already-consumed callback or connect was never initiated.'
      );
      return NextResponse.redirect(
        new URL('/dashboard/accounts?ebay_error=no_pending_oauth', request.url)
      );
    }

    if (account.oauthStateNonce !== receivedNonce) {
      console.error(
        `eBay callback REJECTED — nonce mismatch for account ${accountId}. ` +
        'Possible CSRF or state-fixation attempt.'
      );
      return NextResponse.redirect(
        new URL('/dashboard/accounts?ebay_error=state_mismatch', request.url)
      );
    }

    if (Date.now() > account.oauthStateNonceExpiresAt.getTime()) {
      console.error(
        `eBay callback REJECTED — nonce expired for account ${accountId}. ` +
        `Expired at ${account.oauthStateNonceExpiresAt.toISOString()}.`
      );
      // Clear the stale nonce so the seller gets a clean "Connect" button again
      await Account.findByIdAndUpdate(accountId, {
        oauthStateNonce:          null,
        oauthStateNonceExpiresAt: null,
      });
      return NextResponse.redirect(
        new URL('/dashboard/accounts?ebay_error=oauth_expired', request.url)
      );
    }

    // 5. Exchange the one-time authorization code for access + refresh tokens
    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForTokens(code);

    const accessTokenExpiry = new Date(Date.now() + expiresIn * 1000);

    // 6. Persist the tokens on the Account document.
    //    Also clear the single-use nonce fields — this prevents any replay of
    //    the same callback URL from writing tokens a second time.
    //    NOTE: refresh tokens are stored as plain strings.
    //    TODO: Encrypt ebayRefreshToken at rest once integration is proven in production.
    await Account.findByIdAndUpdate(accountId, {
      ebayRefreshToken:         refreshToken,
      ebayAccessToken:          accessToken,
      ebayAccessTokenExpiry:    accessTokenExpiry,
      ebayConnectedAt:          new Date(),
      needsReconnect:           false,   // clear any prior reconnect warning
      // Consume the nonce — single-use, no replay possible after this point
      oauthStateNonce:          null,
      oauthStateNonceExpiresAt: null,
      updatedAt:                new Date(),
    });

    console.log(
      `eBay OAuth connected successfully for accountId=${accountId}, adminId=${adminId}. Nonce consumed.`
    );

    // 7. Redirect the seller to the dashboard with a success indicator.
    //    The frontend can read ?ebay_connected=1 and display a confirmation toast.
    return NextResponse.redirect(
      new URL('/dashboard/accounts?ebay_connected=1', request.url)
    );

  } catch (error) {
    console.error('eBay callback error:', error);

    // Return a helpful JSON error for API clients / debugging;
    // in a full UI flow you'd redirect to an error page instead.
    return NextResponse.json(
      {
        error: 'eBay OAuth token exchange failed.',
        technicalDetails: error.message,
      },
      { status: 500 }
    );
  }
}
