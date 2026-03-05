import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    await connectDB();

    const userId = session.user.id;

    // Get the conversation and verify access
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' }, 
        { status: 404 }
      );
    }

    // Verify user is part of this conversation
    const isOwner = conversation.ownerId.toString() === userId;
    const isVendor = conversation.vendorUserId.toString() === userId;

    if (!isOwner && !isVendor) {
      return NextResponse.json(
        { error: 'You are not authorized to view this conversation' }, 
        { status: 403 }
      );
    }

    // Get messages
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name email')
      .lean();

    // Get total count for pagination
    const totalCount = await Message.countDocuments({ conversationId });

    return NextResponse.json({ 
      success: true, 
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + messages.length < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' }, 
      { status: 500 }
    );
  }
}
