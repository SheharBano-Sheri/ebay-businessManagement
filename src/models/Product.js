import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  country: {
    type: String
  },
  sku: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  type: {
    type: String
  },
  listingUrl: {
    type: String
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stock: {
    type: Number,
    default: 0
  },
  unitCost: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  images: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved' // Default for non-public vendor products
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
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

// Compound unique index to prevent duplicate SKUs per admin
ProductSchema.index({ adminId: 1, sku: 1 }, { unique: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
