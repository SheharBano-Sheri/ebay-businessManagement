import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
  ownerId: {
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
  vendorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastMessagePreview: {
    type: String,
    maxlength: 200
  },
  ownerUnreadCount: {
    type: Number,
    default: 0
  },
  vendorUnreadCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique conversation per owner-vendor pair
ConversationSchema.index({ ownerId: 1, vendorId: 1 }, { unique: true });

// Index for fetching conversations
ConversationSchema.index({ ownerId: 1, lastMessageAt: -1 });
ConversationSchema.index({ vendorUserId: 1, lastMessageAt: -1 });

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);

export default Conversation;
