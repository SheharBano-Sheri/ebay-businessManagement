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
