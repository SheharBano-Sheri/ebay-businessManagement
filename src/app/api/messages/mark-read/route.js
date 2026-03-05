import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const userId = session.user.id;

    // Get the conversation and verify access
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Verify user is part of this conversation
    const isOwner = conversation.ownerId.toString() === userId;
    const isVendor = conversation.vendorUserId.toString() === userId;

    if (!isOwner && !isVendor) {
      return NextResponse.json(
        {
          error: "You are not authorized to mark messages in this conversation",
        },
        { status: 403 },
      );
    }

    // Mark messages as read based on user type
    if (isOwner) {
      // Mark all vendor messages as read by owner
      await Message.updateMany(
        {
          conversationId,
          senderType: "vendor",
          readByOwner: false,
        },
        {
          readByOwner: true,
          readAt: new Date(),
        },
      );

      // Reset owner unread count
      await Conversation.findByIdAndUpdate(conversationId, {
        ownerUnreadCount: 0,
      });
    } else {
      // Mark all owner messages as read by vendor
      await Message.updateMany(
        {
          conversationId,
          senderType: "owner",
          readByVendor: false,
        },
        {
          readByVendor: true,
          readAt: new Date(),
        },
      );

      // Reset vendor unread count
      await Conversation.findByIdAndUpdate(conversationId, {
        vendorUnreadCount: 0,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 },
    );
  }
}
