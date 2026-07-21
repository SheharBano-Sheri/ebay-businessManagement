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
//   { message, imported, updated, skipped, errors, errorDetails, success }

import { NextResponse }    from 'next/server';
import { getServerSession }  from 'next-auth';
import { authOptions }     from '../../auth/[...nextauth]/route';
import connectDB           from '@/lib/mongodb';
import EbayOrder           from '@/models/EbayOrder';
import Account             from '@/models/Account';
import Product             from '@/models/Product';
import User                from '@/models/User';
import { checkPermission } from '@/lib/permissions';
import {
  refreshAccessToken,
  getOrders,
  getTransactions,
  buildOrderData,
} from '@/lib/ebayFinancesApi';

export async function POST(request) {
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

    // 5. Get a valid access token (refreshes automatically if expired)
    let accessToken;
    try {
      accessToken = await refreshAccessToken(account);
    } catch (tokenErr) {
      return NextResponse.json(
        { error: `eBay token refresh failed: ${tokenErr.message}` },
        { status: 502 }
      );
    }

    // 6. Build the date filter: fetch orders modified in the last `daysBack` days
    const sinceDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const sinceDateISO = sinceDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
    // eBay Fulfillment API filter format: lastmodifieddate:[ISO_DATE...]
    const dateFilter = `lastmodifieddate:[${sinceDateISO}...]`;

    // 7. Fetch all orders (paginate until exhausted)
    let allOrders = [];
    let offset = 0;
    const pageSize = 50; // eBay max per page is 200; 50 is a safe starting point

    try {
      while (true) {
        const page = await getOrders(accessToken, {
          limit:  pageSize,
          filter: dateFilter,
          offset,
        });

        if (!page || page.length === 0) break;

        allOrders = allOrders.concat(page);

        if (page.length < pageSize) break;  // last page
        offset += pageSize;
      }
    } catch (ordersErr) {
      return NextResponse.json(
        { error: `Failed to fetch orders from eBay: ${ordersErr.message}` },
        { status: 502 }
      );
    }

    if (allOrders.length === 0) {
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
        // Uses getTransactions (not getOrderEarningsById) — not geo-restricted.
        let transactions = [];
        try {
          transactions = await getTransactions(accessToken, orderId);
        } catch (txnErr) {
          // Log but don't abort the whole sync — continue with zero fees for this order
          console.warn(`getTransactions failed for orderId=${orderId}:`, txnErr.message);
        }

        // Build the EbayOrder-compatible document
        const orderData = buildOrderData(
          ebayOrder,
          transactions,
          account,
          adminId,
          user._id
        );

        // Attempt SKU→Product link (same fallback logic as CSV upload route)
        if (orderData.sku && orderData.sku !== '--') {
          try {
            const product = await Product.findOne({ sku: orderData.sku, adminId });
            if (product) {
              orderData.productId = product._id;
              // Only auto-fill sourcingCost if seller hasn't already set one on a prior sync
              // (handled below in the conditional $set)
            }
          } catch {
            // Non-fatal — continue without product link
          }
        }

        // Upsert by (adminId, accountId, orderNumber, transactionType).
        // This makes the sync fully idempotent:
        //   - First run: creates the document (upsert)
        //   - Subsequent runs: updates eBay-controlled financial fields only
        //
        // Fields that are NEVER overwritten on update:
        //   sourcingCost, shippingCost
        //   (sellers enter these manually; syncing from eBay should not wipe them)
        const filter = {
          adminId,
          accountId:       account._id,
          orderNumber:     orderData.orderNumber,
          transactionType: orderData.transactionType,
        };

        // Build the $set payload — always update eBay financial fields
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

        // Fields only set on insert (i.e. when the document does not yet exist)
        const $setOnInsert = {
          adminId,
          accountId:       account._id,
          uploadedBy:      orderData.uploadedBy,
          fileHash:        null,
          orderNumber:     orderData.orderNumber,
          transactionType: orderData.transactionType,
          description:     orderData.description,
          sourcingCost:    orderData.sourcingCost,   // 0 for new orders
          shippingCost:    orderData.shippingCost,   // 0 for new orders
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

        // Determine whether this was an insert or an update
        // Mongoose doesn't directly expose "was upserted" from findOneAndUpdate,
        // so we compare createdAt vs updatedAt as a proxy.
        const wasInserted =
          result.createdAt &&
          result.updatedAt &&
          Math.abs(result.createdAt - result.updatedAt) < 2000; // within 2 seconds = new

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
