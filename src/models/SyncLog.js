// src/models/SyncLog.js
//
// Stores one document per eBay account-sync attempt (both cron and manual).
// Replaces pure console.log with a queryable record that sellers/admins can
// inspect without digging through Vercel's log explorer.
//
// Documents auto-expire after 90 days via a MongoDB TTL index on `createdAt`
// so the collection never grows unbounded.
//
// Written by: /api/orders/sync-ebay (trigger='manual')
//          and /api/cron/sync-all-ebay-accounts (trigger='cron')
// Read by:    /api/ebay/sync-health

import mongoose from 'mongoose';

const SyncLogSchema = new mongoose.Schema({
  // --- Identity ---
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // --- What triggered this sync ---
  trigger: {
    type: String,
    enum: ['cron', 'manual'],
    required: true,
  },

  // --- Outcome ---
  status: {
    type: String,
    enum: ['success', 'error', 'skipped'],
    required: true,
  },

  // Only populated when status === 'error'
  errorType: {
    type: String,
    enum: [
      'auth_error',      // EbayAuthError — token revoked/expired (permanent)
      'rate_limit',      // EbayRateLimitError — 429 from eBay (transient)
      'server_error',    // 5xx from eBay (transient)
      'network_error',   // fetch/DNS failure (transient)
      'not_found',       // 404 from eBay (usually transient)
      'unknown',         // anything else
    ],
    default: null,
  },
  errorMessage: {
    type: String,
    default: null,
    // Truncated to 1000 chars to avoid oversized documents
    maxlength: 1000,
  },

  // --- Order stats for the run (null on error/skipped) ---
  imported: { type: Number, default: 0 },
  updated:  { type: Number, default: 0 },
  skipped:  { type: Number, default: 0 },    // orders skipped inside the batch (no orderId etc.)
  orderErrors: { type: Number, default: 0 }, // per-order errors inside a partial-success run

  // --- Performance ---
  durationMs: { type: Number, default: null },      // wall-clock sync time
  ebayCallsThisRun: { type: Number, default: 0 },   // eBay API calls made in this run

  // --- Timestamp (also used for TTL) ---
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index — MongoDB automatically deletes documents 90 days after createdAt.
SyncLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Compound index for the health query: fetch latest log per account quickly.
SyncLogSchema.index({ accountId: 1, createdAt: -1 });

export default mongoose.models.SyncLog || mongoose.model('SyncLog', SyncLogSchema);
