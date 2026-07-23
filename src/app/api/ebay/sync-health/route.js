// src/app/api/ebay/sync-health/route.js
//
// Returns per-account eBay sync health for the logged-in admin.
//
// For each Account that belongs to the admin, it returns:
//   - Connection status (isConnected, needsReconnect, ebayLastSyncedAt)
//   - The most recent SyncLog entry (lastSync)
//   - The most recent SyncLog error entry (lastError), if different from lastSync
//
// This powers the Sync Health dashboard card in Settings → eBay Integration.
//
// GET /api/ebay/sync-health
// Auth: session required (same as all other dashboard routes)
//
// Response: { accounts: [...], apiStats: { callsToday, limit, approaching } }

import { NextResponse }    from 'next/server';
import { getServerSession }  from 'next-auth';
import { authOptions }     from '../../auth/[...nextauth]/route';
import connectDB           from '@/lib/mongodb';
import User                from '@/models/User';
import Account             from '@/models/Account';
import SyncLog             from '@/models/SyncLog';
import { getApiCallStats } from '@/lib/ebayFinancesApi';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email }).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const adminId = user.adminId || user._id;

    // Fetch all accounts for this admin
    const accounts = await Account.find({ adminId })
      .select('accountName ebayUsername ebayRefreshToken needsReconnect ebayLastSyncedAt ebayConnectedAt')
      .lean();

    if (accounts.length === 0) {
      return NextResponse.json({ accounts: [], apiStats: getApiCallStats() }, { status: 200 });
    }

    const accountIds = accounts.map((a) => a._id);

    // Fetch the most recent SyncLog per account (any status) in one query.
    // We sort by createdAt descending and group by accountId client-side
    // to avoid complex aggregation pipeline for this advisory feature.
    const recentLogs = await SyncLog.find({ accountId: { $in: accountIds } })
      .sort({ createdAt: -1 })
      .limit(accountIds.length * 10)  // fetch up to 10 logs per account then filter
      .select('accountId status errorType errorMessage imported updated skipped orderErrors durationMs trigger createdAt')
      .lean();

    // Build lookup maps: accountId → most recent log, accountId → most recent error log
    const lastSyncMap  = new Map();
    const lastErrorMap = new Map();

    for (const log of recentLogs) {
      const key = log.accountId.toString();

      if (!lastSyncMap.has(key)) {
        lastSyncMap.set(key, log);
      }
      if (log.status === 'error' && !lastErrorMap.has(key)) {
        lastErrorMap.set(key, log);
      }
    }

    // Assemble the response payload
    const healthData = accounts.map((account) => {
      const key       = account._id.toString();
      const lastSync  = lastSyncMap.get(key)  || null;
      const lastError = lastErrorMap.get(key) || null;

      return {
        accountId:       account._id,
        accountName:     account.accountName,
        ebayUsername:    account.ebayUsername || null,
        isConnected:     !!account.ebayRefreshToken,
        needsReconnect:  account.needsReconnect || false,
        ebayLastSyncedAt: account.ebayLastSyncedAt || null,
        ebayConnectedAt:  account.ebayConnectedAt || null,
        lastSync:  lastSync  ? {
          status:      lastSync.status,
          imported:    lastSync.imported,
          updated:     lastSync.updated,
          skipped:     lastSync.skipped,
          orderErrors: lastSync.orderErrors,
          durationMs:  lastSync.durationMs,
          trigger:     lastSync.trigger,
          createdAt:   lastSync.createdAt,
        } : null,
        // lastError is only included when it's a different log entry from lastSync
        lastError: lastError && lastError._id?.toString() !== lastSync?._id?.toString()
          ? {
              status:       lastError.status,
              errorType:    lastError.errorType,
              errorMessage: lastError.errorMessage,
              trigger:      lastError.trigger,
              createdAt:    lastError.createdAt,
            }
          : (lastSync?.status === 'error' ? {
              status:       lastSync.status,
              errorType:    lastSync.errorType,
              errorMessage: lastSync.errorMessage,
              trigger:      lastSync.trigger,
              createdAt:    lastSync.createdAt,
            } : null),
      };
    });

    return NextResponse.json({
      accounts: healthData,
      apiStats: getApiCallStats(),
    }, { status: 200 });

  } catch (error) {
    console.error('[sync-health] Route error:', error);
    return NextResponse.json(
      { error: 'Failed to load sync health data.', technicalDetails: error.message },
      { status: 500 }
    );
  }
}
