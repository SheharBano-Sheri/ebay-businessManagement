import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import { sendMessageNotificationEmail } from "@/lib/email";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, content } = await request.json();

    if (!conversationId || !content?.trim()) {
      return NextResponse.json(
        { error: "Conversation ID and content are required" },
        { status: 400 },
      );
    }

    await connectDB();

    const userId = session.user.id;
    const userRole = session.user.role;

    // Get the conversation
    const conversation = await Conversation.findById(conversationId)
      .populate("ownerId", "name email")
      .populate("vendorUserId", "name email")
      .populate("vendorId", "name");

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Verify user is part of this conversation
    const isOwner = conversation.ownerId._id.toString() === userId;
    const isVendor = conversation.vendorUserId._id.toString() === userId;

    if (!isOwner && !isVendor) {
      return NextResponse.json(
        {
          error: "You are not authorized to send messages in this conversation",
        },
        { status: 403 },
      );
    }

    // Determine sender type
    const senderType = isOwner ? "owner" : "vendor";

    // Create the message
    const message = await Message.create({
      conversationId,
      senderId: userId,
      senderType,
      content: content.trim(),
      readByOwner: isOwner,
      readByVendor: isVendor,
    });

    // Update conversation
    const updateData = {
      lastMessageAt: new Date(),
      lastMessagePreview: content.trim().substring(0, 200),
    };

    if (isOwner) {
      updateData.vendorUnreadCount = conversation.vendorUnreadCount + 1;
    } else {
      updateData.ownerUnreadCount = conversation.ownerUnreadCount + 1;
    }

    await Conversation.findByIdAndUpdate(conversationId, updateData);

    // Populate sender info
    await message.populate("senderId", "name email");

    // Send email notification to recipient if they're offline
    try {
      const recipient = isOwner
        ? conversation.vendorUserId
        : conversation.ownerId;
      const sender = isOwner ? conversation.ownerId : conversation.vendorUserId;

      await sendMessageNotificationEmail({
        to: recipient.email,
        recipientName: recipient.name,
        senderName: sender.name,
        messagePreview: content.trim().substring(0, 100),
        conversationId: conversationId,
      });
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
      // Don't fail the message send if email fails
    }

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
