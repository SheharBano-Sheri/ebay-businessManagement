import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountName: {
    type: String,
    required: true
  },
  ebayUsername: {
    type: String
  },
  defaultCurrency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  apiKey: {
    type: String
  },
  // eBay OAuth integration fields
  // TODO: Consider encrypting ebayRefreshToken at rest once the integration is proven in production.
  ebayRefreshToken: {
    type: String,
    default: null   // long-lived OAuth refresh token; populated by /api/ebay/callback
  },
  ebayAccessToken: {
    type: String,
    default: null   // cached short-lived access token; refreshed automatically before API calls
  },
  ebayAccessTokenExpiry: {
    type: Date,
    default: null   // UTC expiry of the cached access token
  },
  ebayConnectedAt: {
    type: Date,
    default: null   // when the seller first completed the OAuth consent flow
  },
  // Set to true by the cron job when a token refresh fails with a non-retryable
  // OAuth error (e.g. invalid_grant, invalid_client). Cleared back to false when
  // the seller successfully reconnects via /api/ebay/callback.
  needsReconnect: {
    type: Boolean,
    default: false
  },
  // Per-attempt OAuth CSRF nonce.
  // Written by /api/ebay/connect when the seller is redirected to eBay.
  // Verified and cleared (single-use) by /api/ebay/callback on return.
  // Prevents state-fixation attacks and silent eBay session re-use from
  // attributing tokens to the wrong GenieBMS account.
  oauthStateNonce: {
    type: String,
    default: null
  },
  oauthStateNonceExpiresAt: {
    type: Date,
    default: null   // set to Date.now + 15 min by /api/ebay/connect
  },
  // Timestamp of the most recent successful cron-driven sync.
  // Used by the cron job to skip accounts synced very recently (< 5.5 h ago),
  // and displayed in the UI as "Last synced: N hours ago".
  ebayLastSyncedAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fast lookups
AccountSchema.index({ adminId: 1 });

export default mongoose.models.Account || mongoose.model('Account', AccountSchema);
