import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentType: {
    type: String,
    enum: ['vendor_payment', 'subscription_payment'],
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  dueDate: {
    type: Date
  },
  description: {
    type: String
  },
  paymentMethod: {
    type: String
  },
  transactionId: {
    type: String
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
PaymentSchema.index({ adminId: 1, paymentDate: -1 });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
