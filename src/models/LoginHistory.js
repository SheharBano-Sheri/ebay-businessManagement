import mongoose from 'mongoose';

const LoginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  browser: {
    type: String
  },
  os: {
    type: String
  },
  device: {
    type: String
  },
  location: {
    type: String
  },
  success: {
    type: Boolean,
    default: true
  },
  sessionId: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
LoginHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.LoginHistory || mongoose.model('LoginHistory', LoginHistorySchema);
