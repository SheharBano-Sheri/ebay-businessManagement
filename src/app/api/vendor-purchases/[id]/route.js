import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import VendorPurchase from "@/models/VendorPurchase";
import Vendor from "@/models/Vendor";

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // --- FIX: Await params before using properties ---
    const { id } = await params;
    // ------------------------------------------------

    const body = await request.json();
    const { status, trackingNumber } = body;

    const purchase = await VendorPurchase.findById(id);
    if (!purchase) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Authorization: Check if user is allowed to update this order
    let isAuthorized = false;
    const userId = session.user.id;

    // 1. Master Admin can always update
    if (session.user.role === "master_admin") {
      isAuthorized = true;
    }
    // 2. Public Vendor (Must be the owner of the vendor linked to this purchase)
    else if (session.user.role === "public_vendor") {
      const vendor = await Vendor.findById(purchase.vendorId);
      if (
        vendor &&
        vendor.publicVendorUserId &&
        vendor.publicVendorUserId.toString() === userId
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized to update this order" },
        { status: 403 },
      );
    }

    // Update Status if provided
    if (status) {
      const validStatuses = ["pending", "processing", "completed", "cancelled"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      purchase.status = status;
    }

    // Update Tracking Number if provided
    if (trackingNumber !== undefined) {
      purchase.trackingNumber = trackingNumber;
    }

    await purchase.save();

    return NextResponse.json(
      { message: "Order updated successfully", purchase },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update purchase error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
