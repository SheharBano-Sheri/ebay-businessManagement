// src/app/api/cron/sync-all-ebay-accounts/route.js
//
// Vercel Cron handler — called automatically on a schedule (every 6 hours,
// configured in vercel.json) to sync ALL connected eBay accounts.
//
// This route is NOT for direct use by sellers. It is an internal, server-to-server
// endpoint secured by a shared secret (CRON_SECRET environment variable).
//
// Security:
//   Vercel Cron jobs automatically attach the header:
//     Authorization: Bearer <CRON_SECRET>
//   when CRON_SECRET is set in the Vercel project environment variables.
//   Any request without this header (or with the wrong secret) is rejected 401.
//
// Behaviour per account:
//   1. Skip accounts flagged needsReconnect — they cannot be synced until the
//      seller reconnects via the UI.
//   2. Skip accounts synced within the last SKIP_THRESHOLD_MS (5.5 hours) to
//      avoid redundant API calls if the cron fires slightly early.
//   3. Attempt to refresh the access token.
//      - EbayAuthError (permanent) → clearStaleTokens + needsReconnect=true + SyncLog
//      - EbayRateLimitError        → log, skip cycle, SyncLog (transient)
//      - Other                     → log, skip cycle, SyncLog (transient)
//   4. Fetch and upsert orders using the same logic as /api/orders/sync-ebay.
//   5. On success, update ebayLastSyncedAt to now + write SyncLog.
//   6. Pause INTER_ACCOUNT_DELAY_MS between accounts to respect eBay rate limits.
//   7. After all accounts, log getApiCallStats() and warn if approaching daily limit.
//
// GET /api/cron/sync-all-ebay-accounts
// Headers: Authorization: Bearer <CRON_SECRET>
//
// Response: { message, processed, skipped, errors, results[] }

import { NextResponse }   from 'next/server';
import connectDB          from '@/lib/mongodb';
import Account            from '@/models/Account';
import EbayOrder          from '@/models/EbayOrder';
import Product            from '@/models/Product';
import SyncLog            from '@/models/SyncLog';
import {
  refreshAccessToken,
  getOrders,
  getTransactions,
  buildOrderData,
  clearStaleTokens,
  getApiCallStats,
  EbayAuthError,
  EbayRateLimitError,
} from '@/lib/ebayFinancesApi';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Skip accounts synced within the last 5.5 hours (330 minutes).
const SKIP_THRESHOLD_MS = 5.5 * 60 * 60 * 1000;

// Pause between each account's sync to avoid hitting eBay rate limits.
const INTER_ACCOUNT_DELAY_MS = 500;

// How many days of orders to fetch per account.
const DAYS_BACK = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple async sleep. */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Classify an error into a SyncLog errorType string. */
function classifyError(err) {
  if (err instanceof EbayAuthError)      return 'auth_error';
  if (err instanceof EbayRateLimitError) return 'rate_limit';
  if (err?.statusCode >= 500)            return 'server_error';
  if (err?.statusCode === 404)           return 'not_found';
  if (err?.message?.toLowerCase().includes('network') ||
      err?.message?.toLowerCase().includes('fetch'))  return 'network_error';
  return 'unknown';
}

/** Write a SyncLog entry. Never throws. */
async function writeSyncLog(data) {
  try {
    await SyncLog.create(data);
  } catch (logErr) {
    console.error('[cron] Failed to write SyncLog:', logErr.message);
  }
}

// ---------------------------------------------------------------------------
// Sync a single account
// ---------------------------------------------------------------------------
async function syncAccount(account) {
  const accountId = account._id;
  const adminId   = account.adminId;
  const label     = `[cron][account:${accountId}]`;
  const startTime = Date.now();

  // 1. Skip accounts already flagged as needing reconnection.
  if (account.needsReconnect) {
    console.log(`${label} Skipping — needsReconnect is set.`);
    await writeSyncLog({
      accountId, adminId, trigger: 'cron', status: 'skipped',
      errorType: 'auth_error',
      errorMessage: 'Account flagged needsReconnect — seller must re-authorise.',
      durationMs: Date.now() - startTime,
    });
    return { status: 'skipped', reason: 'needsReconnect' };
  }

  // 2. Skip accounts synced very recently.
  if (
    account.ebayLastSyncedAt &&
    Date.now() - new Date(account.ebayLastSyncedAt).getTime() < SKIP_THRESHOLD_MS
  ) {
    console.log(`${label} Skipping — synced recently at ${account.ebayLastSyncedAt}.`);
    await writeSyncLog({
      accountId, adminId, trigger: 'cron', status: 'skipped',
      errorMessage: `Synced recently at ${account.ebayLastSyncedAt} — within 5.5h threshold.`,
      durationMs: Date.now() - startTime,
    });
    return { status: 'skipped', reason: 'recentlySynced' };
  }

  // 3. Refresh (or reuse cached) access token.
  let accessToken;
  try {
    accessToken = await refreshAccessToken(account);
  } catch (tokenErr) {
    const durationMs = Date.now() - startTime;
    console.error(`${label} Token refresh failed:`, tokenErr.message);

    if (tokenErr instanceof EbayAuthError) {
      // Permanent failure — mark account so the seller sees the warning in the UI.
      await clearStaleTokens(accountId);
      await writeSyncLog({
        accountId, adminId, trigger: 'cron', status: 'error',
        errorType: 'auth_error',
        errorMessage: tokenErr.message.slice(0, 1000),
        durationMs,
      });
      console.warn(`${label} Marked needsReconnect=true (EbayAuthError)`);
      return { status: 'error', reason: 'tokenRefreshFailed_permanent', error: tokenErr.message };
    }

    // Transient (rate limit, 5xx, network) — skip this cycle, retry next run.
    await writeSyncLog({
      accountId, adminId, trigger: 'cron', status: 'error',
      errorType: classifyError(tokenErr),
      errorMessage: tokenErr.message.slice(0, 1000),
      durationMs,
    });
    return { status: 'error', reason: 'tokenRefreshFailed_transient', error: tokenErr.message };
  }

  // 4. Build date filter — eBay requires [start..end] with full ISO 8601 .sssZ on both dates.
  const nowDate = new Date();
  const sinceDate = new Date(nowDate.getTime() - Number(DAYS_BACK) * 24 * 60 * 60 * 1000);
  const dateFilter = `lastmodifieddate:[${sinceDate.toISOString()}..${nowDate.toISOString()}]`;

  // 5. Fetch all orders (paginated).
  let allOrders = [];
  let offset    = 0;
  const pageSize = 50;

  try {
    while (true) {
      const page = await getOrders(accessToken, {
        limit:  pageSize,
        filter: dateFilter,
        offset,
      });

      if (!page || page.length === 0) break;
      allOrders = allOrders.concat(page);
      if (page.length < pageSize) break;
      offset += pageSize;
    }
  } catch (ordersErr) {
    const durationMs = Date.now() - startTime;
    console.error(`${label} getOrders failed:`, ordersErr.message);
    await writeSyncLog({
      accountId, adminId, trigger: 'cron', status: 'error',
      errorType: classifyError(ordersErr),
      errorMessage: ordersErr.message.slice(0, 1000),
      durationMs,
    });
    return { status: 'error', reason: 'getOrdersFailed', error: ordersErr.message };
  }

  if (allOrders.length === 0) {
    const durationMs = Date.now() - startTime;
    await Account.findByIdAndUpdate(accountId, {
      ebayLastSyncedAt: new Date(),
      updatedAt:        new Date(),
    });
    await writeSyncLog({
      accountId, adminId, trigger: 'cron', status: 'success',
      imported: 0, updated: 0, skipped: 0, orderErrors: 0, durationMs,
      ebayCallsThisRun: getApiCallStats().callsToday,
    });
    return { status: 'success', imported: 0, updated: 0, skipped: 0, errors: 0 };
  }

  // 6. Process each order.
  let imported      = 0;
  let updated       = 0;
  let skippedOrders = 0;
  const orderErrors = [];

  for (const ebayOrder of allOrders) {
    try {
      const orderId = ebayOrder.orderId || ebayOrder.legacyOrderId;
      if (!orderId) {
        skippedOrders++;
        continue;
      }

      let transactions = [];
      try {
        transactions = await getTransactions(accessToken, orderId);
      } catch (txnErr) {
        console.warn(`${label} getTransactions failed for orderId=${orderId}:`, txnErr.message);
      }

      const orderData = buildOrderData(ebayOrder, transactions, account, adminId, null);

      if (orderData.sku && orderData.sku !== '--') {
        try {
          const product = await Product.findOne({ sku: orderData.sku, adminId });
          if (product) orderData.productId = product._id;
        } catch { /* non-fatal */ }
      }

      const filter = {
        adminId,
        accountId:       account._id,
        orderNumber:     orderData.orderNumber,
        transactionType: orderData.transactionType,
      };

      const $setAlways = {
        grossAmount:   orderData.grossAmount,
        fees:          orderData.fees,
        netAmount:     orderData.netAmount,
        grossProfit:   orderData.grossProfit,
        itemName:      orderData.itemName,
        sku:           orderData.sku,
        orderedQty:    orderData.orderedQty,
        currency:      orderData.currency,
        ebayAccount:   orderData.ebayAccount,
        buyerInfo:     orderData.buyerInfo,
        orderDate:     orderData.orderDate,
        updatedAt:     new Date(),
      };

      if (orderData.productId) $setAlways.productId = orderData.productId;

      const $setOnInsert = {
        adminId,
        accountId:       account._id,
        uploadedBy:      null,
        fileHash:        null,
        orderNumber:     orderData.orderNumber,
        transactionType: orderData.transactionType,
        description:     orderData.description,
        sourcingCost:    orderData.sourcingCost,
        shippingCost:    orderData.shippingCost,
        createdAt:       new Date(),
      };

      const result = await EbayOrder.findOneAndUpdate(
        filter,
        { $set: $setAlways, $setOnInsert },
        { upsert: true, new: true, runValidators: false }
      );

      const wasInserted =
        result.createdAt &&
        result.updatedAt &&
        Math.abs(result.createdAt - result.updatedAt) < 2000;

      if (wasInserted) { imported++; } else { updated++; }

    } catch (orderErr) {
      console.error(`${label} Error processing order ${ebayOrder.orderId}:`, orderErr.message);
      orderErrors.push({ orderId: ebayOrder.orderId, error: orderErr.message });
    }
  }

  // 7. Mark sync timestamp and write SyncLog.
  const durationMs = Date.now() - startTime;
  await Account.findByIdAndUpdate(accountId, {
    ebayLastSyncedAt: new Date(),
    updatedAt:        new Date(),
  });

  await writeSyncLog({
    accountId, adminId, trigger: 'cron',
    status: orderErrors.length > 0 && imported + updated === 0 ? 'error' : 'success',
    imported, updated,
    skipped: skippedOrders,
    orderErrors: orderErrors.length,
    durationMs,
    ebayCallsThisRun: getApiCallStats().callsToday,
  });

  console.log(
    `${label} Sync complete. Imported: ${imported}, Updated: ${updated}, ` +
    `Skipped: ${skippedOrders}, Errors: ${orderErrors.length}, Duration: ${durationMs}ms`
  );

  return {
    status:  'success',
    imported,
    updated,
    skipped: skippedOrders,
    errors:  orderErrors.length,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(request) {
  // 1. Authenticate with CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[cron] CRON_SECRET is not set. Refusing request.');
    return NextResponse.json(
      { error: 'Cron endpoint is not configured (CRON_SECRET missing).' },
      { status: 503 }
    );
  }

  const authHeader  = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (bearerToken !== cronSecret) {
    console.warn('[cron] Unauthorized request — invalid or missing CRON_SECRET.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Connect to MongoDB
  try {
    await connectDB();
  } catch (dbErr) {
    console.error('[cron] DB connection failed:', dbErr.message);
    return NextResponse.json(
      { error: 'Database connection failed.', technicalDetails: dbErr.message },
      { status: 503 }
    );
  }

  // 3. Load all accounts with a refresh token
  let accounts;
  try {
    accounts = await Account.find({ ebayRefreshToken: { $ne: null } }).lean();
  } catch (queryErr) {
    console.error('[cron] Failed to query accounts:', queryErr.message);
    return NextResponse.json(
      { error: 'Failed to query accounts.', technicalDetails: queryErr.message },
      { status: 500 }
    );
  }

  if (accounts.length === 0) {
    console.log('[cron] No connected eBay accounts found. Nothing to sync.');
    return NextResponse.json(
      { message: 'No connected eBay accounts to sync.', processed: 0, skipped: 0, errors: 0, results: [] },
      { status: 200 }
    );
  }

  console.log(`[cron] Starting sync batch for ${accounts.length} connected account(s).`);

  // 4. Process each account sequentially
  const results      = [];
  let processedCount = 0;
  let skippedCount   = 0;
  let errorCount     = 0;

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const result  = await syncAccount(account);

    results.push({
      accountId:   account._id,
      accountName: account.accountName,
      ...result,
    });

    if (result.status === 'success')      processedCount++;
    else if (result.status === 'skipped') skippedCount++;
    else                                  errorCount++;

    if (i < accounts.length - 1) await delay(INTER_ACCOUNT_DELAY_MS);
  }

  // 5. Log API call stats after the full batch
  const apiStats = getApiCallStats();
  if (apiStats.approaching) {
    console.warn(
      `[cron] ⚠ API call warning: ${apiStats.callsToday}/${apiStats.limit} calls used today. ` +
      'Approaching eBay daily limit — consider reducing sync frequency or number of accounts.'
    );
  } else {
    console.log(`[cron] API calls today: ${apiStats.callsToday}/${apiStats.limit}`);
  }

  const summary =
    `Cron sync complete. Processed: ${processedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}.`;

  console.log(`[cron] ${summary}`);

  return NextResponse.json(
    {
      message:   summary,
      processed: processedCount,
      skipped:   skippedCount,
      errors:    errorCount,
      results,
      apiStats,
    },
    { status: 200 }
  );
}
