import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import Vendor from "@/models/Vendor";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const userId = session.user.id;
    const userRole = session.user.role;

    let conversations;

    // If user is a public vendor, get conversations where they are the vendor
    if (userRole === "public_vendor") {
      conversations = await Conversation.find({
        vendorUserId: userId,
        isActive: true,
      })
        .populate("ownerId", "name email")
        .populate("vendorId", "name email")
        .sort({ lastMessageAt: -1 })
        .lean();
    } else {
      // Otherwise, get conversations where they are the owner
      const adminId = session.user.adminId || userId;
      conversations = await Conversation.find({
        ownerId: adminId,
        isActive: true,
      })
        .populate("vendorUserId", "name email")
        .populate("vendorId", "name email")
        .sort({ lastMessageAt: -1 })
        .lean();
    }

    return NextResponse.json({
      success: true,
      conversations,
      userType: userRole === "public_vendor" ? "vendor" : "owner",
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 },
    );
  }
}

// POST - Start a new conversation
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vendorId } = await request.json();

    if (!vendorId) {
      return NextResponse.json(
        { error: "Vendor ID is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const userId = session.user.id;
    const adminId = session.user.adminId || userId;

    // Get the vendor details
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    if (vendor.vendorType !== "public") {
      return NextResponse.json(
        { error: "Can only message public vendors" },
        { status: 400 },
      );
    }

    if (!vendor.publicVendorUserId) {
      return NextResponse.json(
        { error: "This vendor has not completed registration" },
        { status: 400 },
      );
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      ownerId: adminId,
      vendorId: vendorId,
    });

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        ownerId: adminId,
        vendorId: vendorId,
        vendorUserId: vendor.publicVendorUserId,
        lastMessageAt: new Date(),
        isActive: true,
      });
    }

    // Populate the conversation with user and vendor details
    await conversation.populate("ownerId", "name email");
    await conversation.populate("vendorId", "name email");
    await conversation.populate("vendorUserId", "name email");

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
}
