// src/lib/ebayFinancesApi.js
//
// eBay API helpers for GenieBMS.
//
// Wraps three eBay REST APIs:
//   1. OAuth token endpoint   — refreshes short-lived access tokens from stored refresh tokens
//   2. Fulfillment API        — lists seller orders (GET /sell/fulfillment/v1/order)
//   3. Finances API           — fetches per-order transactions (GET /sell/finances/v1/transaction)
//
// NOTE: getTransactions uses the Finances API's `getTransactions` endpoint (filtered by orderId)
// rather than `getOrderEarningsById`, because getOrderEarningsById is restricted to US/China/
// Hong Kong sellers only. getTransactions is not geo-restricted and works for all seller locales.
//
// NOTE on domain: The redirect_uri used in refreshAccessToken must match the RuName configured
// in the eBay developer portal. Configured for:
//   https://www.geniebms.com/api/ebay/callback

import Account from '@/models/Account';
import connectDB from '@/lib/mongodb';

// eBay API base URLs (production)
const EBAY_OAUTH_URL       = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_FULFILLMENT_URL = 'https://api.ebay.com/sell/fulfillment/v1/order';
const EBAY_FINANCES_URL    = 'https://api.ebay.com/sell/finances/v1/transaction';

// eBay OAuth scopes required by GenieBMS
const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.finances',
].join(' ');

// ---------------------------------------------------------------------------
// Typed Error Classes
//
// Callers can use `instanceof` to distinguish permanent vs transient failures:
//
//   EbayAuthError      — 401 / token revocation signals (permanent)
//                        → mark account needsReconnect, clear stale tokens
//   EbayRateLimitError — 429 rate limit exceeded (transient)
//                        → skip this cycle, retry next cron run
//   EbayApiError       — any other non-2xx response (transient)
//                        → log and skip, retry next cron run
// ---------------------------------------------------------------------------

export class EbayAuthError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'EbayAuthError';
    this.statusCode = statusCode || 401;
  }
}

export class EbayRateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EbayRateLimitError';
    this.statusCode = 429;
  }
}

export class EbayApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'EbayApiError';
    this.statusCode = statusCode || 500;
  }
}

// ---------------------------------------------------------------------------
// Non-retryable OAuth error keywords.
// If any of these appear in an error response, the refresh token itself is
// invalid/revoked and the seller must re-authorise.
// ---------------------------------------------------------------------------
const NON_RETRYABLE_OAUTH_KEYWORDS = [
  'invalid_grant',
  'invalid_client',
  'access_denied',
  'token_revoked',
];

export function isNonRetryableOAuthError(message) {
  const lower = (message || '').toLowerCase();
  return NON_RETRYABLE_OAUTH_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// API Call Counter
//
// Tracks the number of eBay API calls (getOrders + getTransactions) made
// in the current UTC day. Resets automatically at midnight UTC.
//
// eBay Production keysets allow 5,000 calls/day per keyset.
// When callsToday >= 4,000 (80%), callers should warn in logs.
//
// This is a module-level in-memory counter. In a serverless environment each
// function instance maintains its own count, so the total across instances may
// exceed the displayed figure — it is advisory, not a hard enforcement gate.
// ---------------------------------------------------------------------------
let _callsToday = 0;
let _callDateUTC = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

function _incrementCallCounter() {
  const todayUTC = new Date().toISOString().slice(0, 10);
  if (todayUTC !== _callDateUTC) {
    // New UTC day — reset counter
    _callsToday = 0;
    _callDateUTC = todayUTC;
  }
  _callsToday += 1;
}

/**
 * Returns the current API call stats for the ongoing UTC day.
 * @returns {{ callsToday: number, limit: number, approaching: boolean }}
 */
export function getApiCallStats() {
  // Reset if we've crossed midnight since last check
  const todayUTC = new Date().toISOString().slice(0, 10);
  if (todayUTC !== _callDateUTC) {
    _callsToday  = 0;
    _callDateUTC = todayUTC;
  }
  return {
    callsToday: _callsToday,
    limit:      5000,
    approaching: _callsToday >= 4000,
  };
}

// ---------------------------------------------------------------------------
// clearStaleTokens(accountId)
//
// Marks an Account as needing reconnection and wipes its stored OAuth tokens.
// Called when a token refresh fails with a non-retryable error so the UI
// shows "Reconnect Required" rather than a broken "Connected" state.
// ---------------------------------------------------------------------------
export async function clearStaleTokens(accountId) {
  try {
    await connectDB();
    await Account.findByIdAndUpdate(accountId, {
      needsReconnect:        true,
      ebayRefreshToken:      null,
      ebayAccessToken:       null,
      ebayAccessTokenExpiry: null,
      updatedAt:             new Date(),
    });
    console.warn(
      `[ebayFinancesApi] clearStaleTokens: accountId=${accountId} — ` +
      'tokens cleared, needsReconnect=true'
    );
  } catch (err) {
    // Non-fatal — log but don't swallow the original caller error
    console.error(`[ebayFinancesApi] clearStaleTokens failed for accountId=${accountId}:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Internal: build the Basic-Auth header from app credentials
// ---------------------------------------------------------------------------
function basicAuthHeader() {
  const appId  = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;

  if (!appId || !certId) {
    throw new Error('EBAY_APP_ID and EBAY_CERT_ID must be set in environment variables.');
  }

  const encoded = Buffer.from(`${appId}:${certId}`).toString('base64');
  return `Basic ${encoded}`;
}

// ---------------------------------------------------------------------------
// refreshAccessToken(account)
//
// Given an Account document (Mongoose model instance or plain object with _id),
// exchanges the stored ebayRefreshToken for a fresh access token using the
// OAuth refresh_token grant.
//
// Proactive expiry check: returns the cached token if it's still valid with a
// 60-second buffer — no API call needed. Only calls eBay when the token is
// expired or close to expiring.
//
// Persists the new access token + expiry back to MongoDB so subsequent calls
// in the same sync window reuse it without redundant token exchanges.
//
// Returns: the fresh accessToken string.
// Throws:
//   EbayAuthError    — if exchange fails with a non-retryable OAuth error
//                      (e.g. invalid_grant, invalid_client — seller revoked access)
//   EbayApiError     — if exchange fails for a transient reason
//   Error            — if account has no refresh token
// ---------------------------------------------------------------------------
export async function refreshAccessToken(account) {
  if (!account.ebayRefreshToken) {
    throw new Error(
      `Account ${account._id} has no eBay refresh token. ` +
      'The seller must connect their eBay account via Settings → eBay Integration first.'
    );
  }

  // Return cached access token if it's still valid (with a 60-second buffer).
  // This is the proactive expiry check — we don't wait for eBay to return 401.
  if (
    account.ebayAccessToken &&
    account.ebayAccessTokenExpiry &&
    new Date(account.ebayAccessTokenExpiry) > new Date(Date.now() + 60_000)
  ) {
    return account.ebayAccessToken;
  }

  // Exchange refresh token for a new access token
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: account.ebayRefreshToken,
    scope:         EBAY_SCOPES,
  });

  let response;
  try {
    response = await fetch(EBAY_OAUTH_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': basicAuthHeader(),
      },
      body: body.toString(),
    });
  } catch (fetchErr) {
    // Network-level failure (DNS, timeout, etc.) — transient
    throw new EbayApiError(`eBay token refresh network error: ${fetchErr.message}`);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '(no body)');
    const msg = `eBay token refresh failed (${response.status}): ${errText}`;

    // 401 or a known OAuth revocation keyword → permanent failure
    if (response.status === 401 || isNonRetryableOAuthError(errText)) {
      throw new EbayAuthError(msg, response.status);
    }

    // 429 → rate limit on the token endpoint (unusual but possible)
    if (response.status === 429) {
      throw new EbayRateLimitError(msg);
    }

    // Anything else (5xx, etc.) → transient
    throw new EbayApiError(msg, response.status);
  }

  const data        = await response.json();
  const accessToken = data.access_token;
  // expires_in is in seconds; convert to absolute Date
  const expiryDate  = new Date(Date.now() + data.expires_in * 1000);

  // Persist updated token back to the Account document
  await connectDB();
  await Account.findByIdAndUpdate(account._id, {
    ebayAccessToken:       accessToken,
    ebayAccessTokenExpiry: expiryDate,
    updatedAt:             new Date(),
  });

  return accessToken;
}

// ---------------------------------------------------------------------------
// exchangeCodeForTokens(authCode)
//
// Exchanges a one-time authorization_code (from the OAuth callback) for
// both an access_token AND a refresh_token.
//
// Called only from /api/ebay/callback — not used during normal sync.
//
// Returns: { accessToken, refreshToken, expiresIn }
// Throws:  EbayAuthError on permanent failure, EbayApiError on transient.
// ---------------------------------------------------------------------------
export async function exchangeCodeForTokens(authCode) {
  const ruName = process.env.EBAY_RUNAME;
  const appId  = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;

  if (!ruName) {
    throw new Error('EBAY_RUNAME environment variable is not set.');
  }

  // ── TEMPORARY DEBUG — server-side only, remove after resolving 401 ─────────
  console.log('[eBay OAuth debug] EBAY_APP_ID  length:', appId  ? appId.length  : 'MISSING/EMPTY');
  console.log('[eBay OAuth debug] EBAY_CERT_ID length:', certId ? certId.length : 'MISSING/EMPTY');
  console.log('[eBay OAuth debug] EBAY_RUNAME  value:', ruName);
  console.log('[eBay OAuth debug] Token endpoint:', EBAY_OAUTH_URL);
  if (appId && certId) {
    const testEncoded = Buffer.from(`${appId}:${certId}`).toString('base64');
    console.log('[eBay OAuth debug] Encoded credential first 20 chars:', testEncoded.slice(0, 20) + '...');
  }
  // ── END TEMPORARY DEBUG ────────────────────────────────────────────────────

  const body = new URLSearchParams({
    grant_type:   'authorization_code',
    code:         authCode,
    redirect_uri: ruName,   // eBay uses the RuName as redirect_uri in the token exchange
  });

  let response;
  try {
    response = await fetch(EBAY_OAUTH_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': basicAuthHeader(),
      },
      body: body.toString(),
    });
  } catch (fetchErr) {
    throw new EbayApiError(`eBay code exchange network error: ${fetchErr.message}`);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '(no body)');
    const msg = `eBay authorization_code exchange failed (${response.status}): ${errText}`;
    if (response.status === 401 || isNonRetryableOAuthError(errText)) {
      throw new EbayAuthError(msg, response.status);
    }
    throw new EbayApiError(msg, response.status);
  }

  const data = await response.json();

  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresIn:    data.expires_in,      // seconds
  };
}

// ---------------------------------------------------------------------------
// getOrders(accessToken, opts)
//
// Lists orders from the eBay Fulfillment API.
//
// opts:
//   limit       {number}  — max orders per page (eBay max 200, default 50)
//   filter      {string}  — eBay filter string
//   offset      {number}  — pagination offset
//
// Returns: array of eBay order objects (may be empty).
// Throws:  EbayAuthError | EbayRateLimitError | EbayApiError
// ---------------------------------------------------------------------------
export async function getOrders(accessToken, opts = {}) {
  const { limit = 50, filter, offset = 0 } = opts;

  // IMPORTANT: URLSearchParams would percent-encode brackets and colons in the
  // filter value (e.g. "[" → "%5B", ":" → "%3A") which breaks eBay's filter
  // parser and causes errorId 30010 "Invalid date format".
  // Instead, build limit/offset via URLSearchParams and append the filter raw.
  const baseParams = new URLSearchParams({ limit, offset });
  let url = `${EBAY_FULFILLMENT_URL}?${baseParams.toString()}`;
  if (filter) {
    // Append filter un-encoded so eBay sees: filter=lastmodifieddate:[start..end]
    url += `&filter=${filter}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method:  'GET',
      headers: {
        'Authorization':           `Bearer ${accessToken}`,
        'Content-Type':            'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB',
      },
    });
  } catch (fetchErr) {
    throw new EbayApiError(`eBay getOrders network error: ${fetchErr.message}`);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '(no body)');
    const msg = `eBay getOrders failed (${response.status}): ${errText}`;

    if (response.status === 401) throw new EbayAuthError(msg, 401);
    if (response.status === 429) throw new EbayRateLimitError(msg);
    throw new EbayApiError(msg, response.status);
  }

  // Count this call against the daily limit
  _incrementCallCounter();

  const data = await response.json();
  return data.orders || [];
}

// ---------------------------------------------------------------------------
// getTransactions(accessToken, orderId)
//
// Fetches all financial transactions for a specific order from the
// eBay Finances API, filtered by orderId.
//
// This endpoint is NOT geo-restricted (unlike getOrderEarningsById).
//
// Returns: array of transaction objects (may be empty).
// Throws:  EbayAuthError | EbayRateLimitError | EbayApiError
// ---------------------------------------------------------------------------
export async function getTransactions(accessToken, orderId) {
  const filter = `orderId:{${orderId}}`;
  const params = new URLSearchParams({ filter });
  const url    = `${EBAY_FINANCES_URL}?${params.toString()}`;

  let response;
  try {
    response = await fetch(url, {
      method:  'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
    });
  } catch (fetchErr) {
    throw new EbayApiError(`eBay getTransactions network error (orderId=${orderId}): ${fetchErr.message}`);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '(no body)');
    const msg = `eBay getTransactions failed for orderId ${orderId} (${response.status}): ${errText}`;

    if (response.status === 401) throw new EbayAuthError(msg, 401);
    if (response.status === 429) throw new EbayRateLimitError(msg);
    throw new EbayApiError(msg, response.status);
  }

  // Count this call against the daily limit
  _incrementCallCounter();

  const data = await response.json();
  return data.transactions || [];
}

// ---------------------------------------------------------------------------
// buildOrderData(ebayOrder, transactions, account, adminId, userId)
//
// Pure mapping function — translates an eBay Fulfillment API order object
// and its associated Finances API transactions into the orderData shape
// expected by EbayOrder (the Mongoose model).
//
// Output field mapping:
//   grossAmount   — buyer-paid total (pricingSummary.total.value)
//   fees          — total platform fees (sum of totalFeeAmount across transactions)
//   netAmount     — grossAmount - fees
//   sourcingCost  — 0 (sellers enter this separately via CSV cost update or manual edit)
//   shippingCost  — 0 (same as above)
//   grossProfit   — netAmount - sourcingCost - shippingCost (matches EbayOrder pre-save hook)
//   fileHash      — null (API-sourced orders have no file hash; field is required: false)
//
// Returns: a plain object matching the EbayOrder schema exactly.
// ---------------------------------------------------------------------------
export function buildOrderData(ebayOrder, transactions, account, adminId, userId) {
  // --- Gross amount: total amount the buyer paid ---
  const grossAmount = parseFloat(
    ebayOrder.pricingSummary?.total?.value ?? 0
  );

  // --- Fees: sum totalFeeAmount from all SALE-type transactions for this order ---
  // totalFeeAmount represents the combined eBay fees (FVF fixed + variable, regulatory, etc.)
  let totalFees = 0;
  for (const txn of transactions) {
    const feeAmount = parseFloat(txn.totalFeeAmount?.value ?? 0);
    // Fees are reported as positive values in the Finances API response
    totalFees += Math.abs(feeAmount);
  }

  const netAmount    = grossAmount - totalFees;
  // sourcingCost and shippingCost start at 0; sellers fill in later
  const sourcingCost  = 0;
  const shippingCost  = 0;
  const grossProfit   = netAmount - sourcingCost - shippingCost;

  // --- Extract order metadata ---
  const orderNumber = ebayOrder.orderId ?? ebayOrder.legacyOrderId ?? '';

  const orderDate = ebayOrder.creationDate
    ? new Date(ebayOrder.creationDate)
    : new Date();

  // Line items: take the first line item for SKU/itemName (most orders are single-item)
  const firstLineItem = (ebayOrder.lineItems ?? [])[0] ?? {};
  const sku        = firstLineItem.sku || '--';
  const itemName   = firstLineItem.title || 'Untitled Item';
  const orderedQty = parseInt(firstLineItem.quantity ?? 1, 10) || 1;

  // Buyer info
  const buyer = ebayOrder.buyer ?? {};
  const buyerInfo = {
    username: buyer.username || '',
    email:    buyer.taxAddress?.email || '',
  };

  // Currency: prefer the order's native currency, fall back to account default
  const currency =
    ebayOrder.pricingSummary?.total?.currency ||
    account.defaultCurrency ||
    'GBP';

  // Map eBay order status to our transactionType
  let transactionType = 'Sale';
  if (ebayOrder.cancelStatus?.cancelState === 'CANCEL_COMPLETE') {
    transactionType = 'Cancellation';
  }

  return {
    adminId,
    accountId:       account._id,
    uploadedBy:      userId,   // null for cron-sourced syncs
    fileHash:        null,     // API-sourced orders have no CSV file hash
    orderNumber,
    sku,
    itemName,
    orderedQty,
    transactionType,
    grossAmount,
    fees:            totalFees,
    netAmount,
    description:     '',
    sourcingCost,
    shippingCost,
    grossProfit,
    currency,
    orderDate,
    ebayAccount:     account.ebayUsername || '',
    buyerInfo,
  };
}
