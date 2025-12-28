import mongoose from 'mongoose';

const skuMappingSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userSku: {
    type: String,
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
    required: true
  },
  vendorSku: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
skuMappingSchema.index({ adminId: 1, userSku: 1, vendorId: 1 }, { unique: true });

const SkuMapping = mongoose.models.SkuMapping || mongoose.model('SkuMapping', skuMappingSchema);

export default SkuMapping;
