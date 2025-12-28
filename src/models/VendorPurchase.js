import mongoose from 'mongoose';

const vendorPurchaseSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  // Product details at time of purchase (snapshot)
  productSnapshot: {
    sku: String,
    name: String,
    unitCost: Number,
    currency: String,
  },
  // --- CONTACT & DELIVERY FIELDS ---
  contactName: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  // ---------------------------------
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  totalCost: {
    type: Number,
    required: true
  },
  // Document uploads
  paymentProofs: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: Date
  }],
  shippingLabels: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: Date
  }],
  packingSlips: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: Date
  }],
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
vendorPurchaseSchema.index({ adminId: 1, createdAt: -1 });
vendorPurchaseSchema.index({ vendorId: 1, createdAt: -1 });
vendorPurchaseSchema.index({ status: 1, createdAt: -1 });

const VendorPurchase = mongoose.models.VendorPurchase || mongoose.model('VendorPurchase', vendorPurchaseSchema);

export default VendorPurchase;