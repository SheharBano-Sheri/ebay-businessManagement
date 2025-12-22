import mongoose from 'mongoose';

const TeamMemberSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['member', 'manager', 'admin', 'owner'],
    default: 'member'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive'],
    default: 'pending'
  },
  inviteToken: {
    type: String,
    unique: true,
    sparse: true
  },
  permissions: {
    orders: [String],
    inventory: [String],
    vendors: [String],
    accounts: [String],
    payments: [String]
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
TeamMemberSchema.index({ adminId: 1 });
TeamMemberSchema.index({ email: 1, adminId: 1 }, { unique: true });

// Delete and recreate model to avoid caching issues
delete mongoose.connection.models['TeamMember'];

export default mongoose.model('TeamMember', TeamMemberSchema);
