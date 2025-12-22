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
    enum: ['owner', 'team_member', 'public_vendor'],
    default: 'owner'
  },
  membershipPlan: {
    type: String,
    enum: ['personal', 'pro', 'enterprise'],
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

export default mongoose.models.User || mongoose.model('User', UserSchema);
