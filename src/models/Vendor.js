import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  contactName: {
    type: String
  },
  phone: {
    type: String
  },
  website: {
    type: String
  },
  vendorType: {
    type: String,
    enum: ['public', 'private', 'virtual'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive'],
    default: 'active'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  inviteToken: {
    type: String,
    unique: true,
    sparse: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // For public vendors - this is their user ID
  publicVendorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // For private/virtual vendors - linked to admin
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  description: {
    type: String
  },
  notes: {
    type: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
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

export default mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);
