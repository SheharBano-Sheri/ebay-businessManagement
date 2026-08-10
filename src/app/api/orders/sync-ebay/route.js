// src/app/api/orders/sync-ebay/route.js
//
// Fetches live orders and transaction fees from eBay APIs and upserts them
// into MongoDB as EbayOrder documents, producing the same data shape as the
// existing CSV upload flow.
//
// The CSV upload route (src/app/api/orders/upload/route.js) is kept intact as
// a fallback / manual override. Sellers can use either or both — CSV-uploaded
// orders and API-synced orders coexist. If an order exists from a previous CSV
// upload and is then re-synced via this route, the upsert updates eBay-controlled
// financial fields (grossAmount, fees, netAmount, grossProfit) but PRESERVES
// seller-entered fields (sourcingCost, shippingCost) that were added manually.
//
// POST /api/orders/sync-ebay
// Body (JSON):
//   {
//     accountId: string,   // required — the Account._id to sync
//     daysBack:  number    // optional — how many days of orders to fetch (default: 30)
//   }
//
// Response:
//   { message, imported, updated, skipped, errors, errorDetails, success, needsReconnect? }

import { NextResponse }    from 'next/server';
import { getServerSession }  from 'next-auth';
import { authOptions }     from '../../auth/[...nextauth]/route';
import connectDB           from '@/lib/mongodb';
import EbayOrder           from '@/models/EbayOrder';
import Account             from '@/models/Account';
import Product             from '@/models/Product';
import SyncLog             from '@/models/SyncLog';
import User                from '@/models/User';
import { checkPermission } from '@/lib/permissions';
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
// Helper: classify an error into a SyncLog errorType string
// ---------------------------------------------------------------------------
function classifyError(err) {
  if (err instanceof EbayAuthError)      return 'auth_error';
  if (err instanceof EbayRateLimitError) return 'rate_limit';
  if (err?.statusCode >= 500)            return 'server_error';
  if (err?.statusCode === 404)           return 'not_found';
  if (err?.message?.toLowerCase().includes('network') ||
      err?.message?.toLowerCase().includes('fetch'))  return 'network_error';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Helper: write a SyncLog entry (fire-and-forget, never throws)
// ---------------------------------------------------------------------------
async function writeSyncLog(data) {
  try {
    await SyncLog.create(data);
  } catch (logErr) {
    console.error('[sync-ebay] Failed to write SyncLog:', logErr.message);
  }
}

export async function POST(request) {
  const startTime = Date.now();

  try {
    // 1. Permission gate — same as the CSV upload route
    const { authorized, user, error: permError } = await checkPermission('orders', 'edit');
    if (!authorized) {
      return NextResponse.json(
        { error: permError || 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await connectDB();

    const adminId = user.adminId || user._id;

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body. Expected { accountId, daysBack? }' },
        { status: 400 }
      );
    }

    const { accountId, daysBack = 30 } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    // 3. Load the Account and verify ownership
    const account = await Account.findOne({ _id: accountId, adminId });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // 4. Check that the seller has connected their eBay account
    if (!account.ebayRefreshToken) {
      return NextResponse.json(
        {
          error: 'This eBay account has not been connected yet. ' +
                 'Use the "Connect eBay Account" button in Settings to authorise access.',
        },
        { status: 400 }
      );
    }

    // 5. Get a valid access token (refreshes proactively if close to expiry)
    let accessToken;
    try {
      accessToken = await refreshAccessToken(account);
    } catch (tokenErr) {
      const durationMs = Date.now() - startTime;

      // Permanent auth failure — clear stale tokens so UI shows "Not Connected"
      if (tokenErr instanceof EbayAuthError) {
        await clearStaleTokens(account._id);
        await writeSyncLog({
          accountId: account._id,
          adminId,
          trigger:      'manual',
          status:       'error',
          errorType:    'auth_error',
          errorMessage: tokenErr.message.slice(0, 1000),
          durationMs,
        });
        return NextResponse.json(
          {
            error:          `eBay token refresh failed (authorisation revoked): ${tokenErr.message}`,
            needsReconnect: true,
          },
          { status: 400 }
        );
      }

      // Transient failure
      await writeSyncLog({
        accountId: account._id,
        adminId,
        trigger:      'manual',
        status:       'error',
        errorType:    classifyError(tokenErr),
        errorMessage: tokenErr.message.slice(0, 1000),
        durationMs,
      });
      return NextResponse.json(
        { error: `eBay token refresh failed: ${tokenErr.message}` },
        { status: 502 }
      );
    }

    // 6. Build the date filter
    // eBay Fulfillment API requires BOTH a start AND end date with full ISO 8601
    // milliseconds (.sssZ) and the two-dot range separator:
    //   lastmodifieddate:[2026-06-23T12:24:27.000Z..2026-07-23T12:24:27.000Z]
    // errorId 30810 ("Invalid date format") is thrown when:
    //   - milliseconds are missing (e.g. 2026-06-23T12:24:27Z)
    //   - brackets [ ] are sent un-encoded and mangled by Node's URL parser
    //   - open-ended range is used instead of explicit start..end
    // The filter value is percent-encoded in getOrders() via encodeURIComponent
    // so that brackets survive Node's WHATWG URL parser intact.
    const nowDate = new Date();
    const sinceDate = new Date(nowDate.getTime() - Number(daysBack) * 24 * 60 * 60 * 1000);
    const dateFilter = `lastmodifieddate:[${sinceDate.toISOString()}..${nowDate.toISOString()}]`;
    console.log('[sync-ebay] eBay date filter (before encoding):', dateFilter);

    // 7. Fetch all orders (paginate until exhausted)
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
      await writeSyncLog({
        accountId: account._id,
        adminId,
        trigger:      'manual',
        status:       'error',
        errorType:    classifyError(ordersErr),
        errorMessage: ordersErr.message.slice(0, 1000),
        durationMs,
      });
      return NextResponse.json(
        { error: `Failed to fetch orders from eBay: ${ordersErr.message}` },
        { status: 502 }
      );
    }

    if (allOrders.length === 0) {
      const durationMs = Date.now() - startTime;
      await writeSyncLog({
        accountId: account._id,
        adminId,
        trigger:   'manual',
        status:    'success',
        imported:  0,
        updated:   0,
        skipped:   0,
        orderErrors: 0,
        durationMs,
        ebayCallsThisRun: getApiCallStats().callsToday,
      });
      return NextResponse.json(
        {
          message:  `No eBay orders found in the last ${daysBack} days.`,
          imported: 0,
          updated:  0,
          skipped:  0,
          errors:   0,
          success:  true,
        },
        { status: 200 }
      );
    }

    // 8. Process each order: fetch transactions → build orderData → upsert
    let imported    = 0;
    let updated     = 0;
    let skipped     = 0;
    const errorDetails = [];

    for (const ebayOrder of allOrders) {
      try {
        const orderId = ebayOrder.orderId || ebayOrder.legacyOrderId;
        if (!orderId) {
          skipped++;
          continue;
        }

        // Fetch financial transactions for this order from the Finances API.
        let transactions = [];
        try {
          transactions = await getTransactions(accessToken, orderId);
        } catch (txnErr) {
          console.warn(`sync-ebay: getTransactions failed for orderId=${orderId}:`, txnErr.message);
        }

        // Build the EbayOrder-compatible document
        const orderData = buildOrderData(
          ebayOrder,
          transactions,
          account,
          adminId,
          user._id
        );

        // Attempt SKU→Product link
        if (orderData.sku && orderData.sku !== '--') {
          try {
            const product = await Product.findOne({ sku: orderData.sku, adminId });
            if (product) {
              orderData.productId = product._id;
            }
          } catch {
            // Non-fatal
          }
        }

        // Upsert by (adminId, accountId, orderNumber, transactionType).
        // Idempotent — guaranteed by compound unique index on EbayOrder.
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

        if (orderData.productId) {
          $setAlways.productId = orderData.productId;
        }

        const $setOnInsert = {
          adminId,
          accountId:       account._id,
          uploadedBy:      orderData.uploadedBy,
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
          {
            $set:        $setAlways,
            $setOnInsert: $setOnInsert,
          },
          {
            upsert:         true,
            new:            true,
            runValidators:  false,
          }
        );

        const wasInserted =
          result.createdAt &&
          result.updatedAt &&
          Math.abs(result.createdAt - result.updatedAt) < 2000;

        if (wasInserted) {
          imported++;
        } else {
          updated++;
        }

      } catch (orderErr) {
        console.error(`sync-ebay: error processing order ${ebayOrder.orderId}:`, orderErr);
        errorDetails.push({
          orderId: ebayOrder.orderId,
          error:   orderErr.message,
        });
      }
    }

    const totalErrors = errorDetails.length;
    const durationMs  = Date.now() - startTime;

    // Log API call stats — warn if approaching daily limit
    const apiStats = getApiCallStats();
    if (apiStats.approaching) {
      console.warn(
        `[sync-ebay] API call warning: ${apiStats.callsToday}/${apiStats.limit} ` +
        'calls used today. Approaching eBay daily limit.'
      );
    }

    // Write SyncLog
    await writeSyncLog({
      accountId: account._id,
      adminId,
      trigger:   'manual',
      status:    totalErrors > 0 && imported + updated === 0 ? 'error' : 'success',
      imported,
      updated,
      skipped,
      orderErrors: totalErrors,
      durationMs,
      ebayCallsThisRun: apiStats.callsToday,
    });

    return NextResponse.json(
      {
        message: totalErrors > 0
          ? `eBay sync complete. Imported ${imported}, updated ${updated}, ${totalErrors} error(s).`
          : `eBay sync complete. Imported ${imported} new orders, updated ${updated} existing orders.`,
        imported,
        updated,
        skipped,
        errors:       totalErrors,
        errorDetails,
        success:      true,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('sync-ebay route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', technicalDetails: error.message },
      { status: 500 }
    );
  }
}
