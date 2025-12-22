import mongoose from 'mongoose';

const EbayOrderSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  orderDate: {
    type: Date,
    required: true
  },
  sku: {
    type: String,
    required: false,
    default: '--'
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  itemName: {
    type: String,
    required: false,
    default: '--'
  },
  orderedQty: {
    type: Number,
    required: true,
    default: 1
  },
  transactionType: {
    type: String,
    default: 'Sale'
  },
  grossAmount: {
    type: Number,
    required: true
  },
  fees: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  sourcingCost: {
    type: Number,
    default: 0
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  grossProfit: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  ebayAccount: {
    type: String
  },
  buyerInfo: {
    username: String,
    email: String
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

// Calculate gross profit before saving - async function without next()
EbayOrderSchema.pre('save', async function() {
  this.grossProfit = this.grossAmount - this.fees - this.sourcingCost - this.shippingCost;
});

// Also handle updates via findOneAndUpdate, findByIdAndUpdate, etc.
EbayOrderSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function() {
  const update = this.getUpdate();
  
  // If any of the cost fields are being updated, we need to recalculate grossProfit
  if (update.$set && (update.$set.fees !== undefined || update.$set.sourcingCost !== undefined || update.$set.shippingCost !== undefined || update.$set.grossAmount !== undefined)) {
    // We'll handle this in the route by fetching the order first
    // This middleware serves as documentation that grossProfit needs recalculation
  }
});

// Index for fast lookups
EbayOrderSchema.index({ adminId: 1, orderDate: -1 });
EbayOrderSchema.index({ adminId: 1, sku: 1 });

// Always delete cached model to pick up schema changes in development
delete mongoose.connection.models['EbayOrder'];

const EbayOrder = mongoose.model('EbayOrder', EbayOrderSchema);
export default EbayOrder;
