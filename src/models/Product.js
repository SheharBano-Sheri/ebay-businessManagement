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
ProductSchema.index({ adminId: 1, sku: 1 });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
