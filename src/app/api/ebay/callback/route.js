// src/app/api/ebay/callback/route.js
//
// eBay OAuth callback handler.
//
// Called by eBay after the seller grants (or declines) consent on eBay's
// authorization page. eBay redirects here with:
//   ?code=<authorizationCode>&state=<accountId>     (consent granted)
//   ?error=access_denied&state=<accountId>           (consent declined)
//
// On success, this route:
//   1. Exchanges the authorization code for access + refresh tokens
//   2. Stores the refresh token (and initial access token) on the Account document
//   3. Redirects the seller's browser to the dashboard with a success notice
//
// On failure / denial:
//   Redirects to /login (the Auth declined URL configured in the eBay developer portal)
//   with an error query param so the UI can surface a friendly message.
//
// Registered callback URLs in the eBay developer portal RuName:
//   Auth accepted URL: https://www.geniebms.com/api/ebay/callback
//   Auth declined URL: https://www.geniebms.com/login

import { NextResponse }   from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions }    from '../../auth/[...nextauth]/route';
import connectDB          from '@/lib/mongodb';
import User               from '@/models/User';
import Account            from '@/models/Account';
import { exchangeCodeForTokens } from '@/lib/ebayFinancesApi';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code       = searchParams.get('code');
  const state      = searchParams.get('state');   // accountId, set in /api/ebay/connect
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
  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing authorization code or state parameter from eBay callback.' },
      { status: 400 }
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

    // 3. The state parameter carries the accountId (set in /api/ebay/connect)
    const accountId = state;

    // 4. Verify the account exists and belongs to this admin
    const account = await Account.findOne({ _id: accountId, adminId });
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found or does not belong to your organisation.' },
        { status: 404 }
      );
    }

    // 5. Exchange the one-time authorization code for access + refresh tokens
    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForTokens(code);

    const accessTokenExpiry = new Date(Date.now() + expiresIn * 1000);

    // 6. Persist the tokens on the Account document.
    //    NOTE: refresh tokens are stored as plain strings.
    //    TODO: Encrypt ebayRefreshToken at rest once integration is proven in production.
    await Account.findByIdAndUpdate(accountId, {
      ebayRefreshToken:      refreshToken,
      ebayAccessToken:       accessToken,
      ebayAccessTokenExpiry: accessTokenExpiry,
      ebayConnectedAt:       new Date(),
      needsReconnect:        false,   // clear any prior reconnect warning
      updatedAt:             new Date(),
    });

    console.log(
      `eBay OAuth connected successfully for accountId=${accountId}, adminId=${adminId}`
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
