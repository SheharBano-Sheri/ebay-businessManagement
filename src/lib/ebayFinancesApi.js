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
const EBAY_OAUTH_URL      = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_FULFILLMENT_URL = 'https://api.ebay.com/sell/fulfillment/v1/order';
const EBAY_FINANCES_URL    = 'https://api.ebay.com/sell/finances/v1/transaction';

// eBay OAuth scopes required by GenieBMS
const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.finances',
].join(' ');

// ---------------------------------------------------------------------------
// Internal: build the Basic-Auth header from app credentials
// ---------------------------------------------------------------------------
function basicAuthHeader() {
  const appId   = process.env.EBAY_APP_ID;
  const certId  = process.env.EBAY_CERT_ID;

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
// Persists the new access token + expiry back to MongoDB so subsequent calls
// in the same sync window reuse it without redundant token exchanges.
//
// Returns: the fresh accessToken string.
// Throws:  if the account has no refresh token, or the exchange fails.
// ---------------------------------------------------------------------------
export async function refreshAccessToken(account) {
  if (!account.ebayRefreshToken) {
    throw new Error(
      `Account ${account._id} has no eBay refresh token. ` +
      'The seller must connect their eBay account via Settings → eBay Integration first.'
    );
  }

  // Return cached access token if it's still valid (with a 60-second buffer)
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

  const response = await fetch(EBAY_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': basicAuthHeader(),
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `eBay token refresh failed (${response.status}): ${errText}`
    );
  }

  const data = await response.json();
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

  const response = await fetch(EBAY_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': basicAuthHeader(),
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `eBay authorization_code exchange failed (${response.status}): ${errText}`
    );
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
//   filter      {string}  — eBay filter string, e.g. 'lastmodifieddate:[2024-01-01T00:00:00.000Z...]'
//   offset      {number}  — pagination offset
//
// Returns: array of eBay order objects (may be empty).
// ---------------------------------------------------------------------------
export async function getOrders(accessToken, opts = {}) {
  const { limit = 50, filter, offset = 0 } = opts;

  const params = new URLSearchParams({ limit, offset });
  if (filter) params.set('filter', filter);

  const url = `${EBAY_FULFILLMENT_URL}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB', // default; overridden if account specifies marketplace
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `eBay getOrders failed (${response.status}): ${errText}`
    );
  }

  const data = await response.json();
  return data.orders || [];
}

// ---------------------------------------------------------------------------
// getTransactions(accessToken, orderId)
//
// Fetches all financial transactions for a specific order from the
// eBay Finances API, filtered by orderId.
//
// This endpoint is NOT geo-restricted (unlike getOrderEarningsById which
// is US/China/HK only), making it suitable for GenieBMS's multi-tenant,
// multi-locale seller base.
//
// Returns: array of transaction objects (may be empty).
// ---------------------------------------------------------------------------
export async function getTransactions(accessToken, orderId) {
  // eBay Finances API filter syntax for orderId
  const filter = `orderId:{${orderId}}`;
  const params = new URLSearchParams({ filter });

  const url = `${EBAY_FINANCES_URL}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `eBay getTransactions failed for orderId ${orderId} (${response.status}): ${errText}`
    );
  }

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

  const netAmount  = grossAmount - totalFees;
  // sourcingCost and shippingCost start at 0; sellers fill in later
  const sourcingCost  = 0;
  const shippingCost  = 0;
  const grossProfit   = netAmount - sourcingCost - shippingCost;

  // --- Extract order metadata ---
  // eBay order IDs look like "12-12345-12345"
  const orderNumber = ebayOrder.orderId ?? ebayOrder.legacyOrderId ?? '';

  const orderDate = ebayOrder.creationDate
    ? new Date(ebayOrder.creationDate)
    : new Date();

  // Line items: take the first line item for SKU/itemName (most orders are single-item)
  const firstLineItem = (ebayOrder.lineItems ?? [])[0] ?? {};
  const sku      = firstLineItem.sku || '--';
  const itemName = firstLineItem.title || 'Untitled Item';
  const orderedQty = parseInt(firstLineItem.quantity ?? 1, 10) || 1;

  // Buyer info (may not always be present depending on eBay API permissions)
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
  // eBay orderFulfillmentStatus: NOT_STARTED, IN_PROGRESS, FULFILLED
  // eBay cancelStatus: PURCHASE_ORDER_CANCELLED or absent
  let transactionType = 'Sale';
  if (ebayOrder.cancelStatus?.cancelState === 'CANCEL_COMPLETE') {
    transactionType = 'Cancellation';
  }

  return {
    adminId,
    accountId:       account._id,
    uploadedBy:      userId,
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
