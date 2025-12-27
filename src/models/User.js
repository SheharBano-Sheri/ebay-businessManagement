import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  accountType: {
    type: String,
    enum: ['user', 'public_vendor'],
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'member', 'manager', 'admin', 'team_member', 'public_vendor', 'master_admin'],
    default: 'owner'
  },
  membershipPlan: {
    type: String,
    enum: ['personal', 'pro', 'enterprise', 'invited', 'team_member'],
    default: 'personal'
  },
  membershipStart: {
    type: Date,
    default: Date.now
  },
  membershipEnd: {
    type: Date
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // For team members, this references their admin
  },
  permissions: {
    orders: [String],
    inventory: [String],
    vendors: [String],
    accounts: [String],
    payments: [String],
    team: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // For public vendors - approval status
  vendorApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved' // Explicitly set in signup route for public vendors
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

export default mongoose.models.User || mongoose.model('User', UserSchema);
