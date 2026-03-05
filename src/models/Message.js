import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderType: {
      type: String,
      enum: ["owner", "vendor"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    readByOwner: {
      type: Boolean,
      default: false,
    },
    readByVendor: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    attachments: [
      {
        filename: String,
        url: String,
        fileSize: Number,
        mimeType: String,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient querying
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, readByOwner: 1, senderType: 1 });
MessageSchema.index({ conversationId: 1, readByVendor: 1, senderType: 1 });

const Message =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);

export default Message;
