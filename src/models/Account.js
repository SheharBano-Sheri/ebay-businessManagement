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
