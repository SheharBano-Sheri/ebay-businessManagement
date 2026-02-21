import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Session from "@/models/Session";
import LoginHistory from "@/models/LoginHistory";
import Product from "@/models/Product";
import EbayOrder from "@/models/EbayOrder";
import TeamMember from "@/models/TeamMember";
import Payment from "@/models/Payment";
import Account from "@/models/Account";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "master_admin") {
      return Response.json(
        { error: "Unauthorized - Master admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    await connectDB();

    // Prevent deletion of master admin accounts
    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (userToDelete.role === "master_admin") {
      return Response.json(
        { error: "Cannot delete master admin accounts" },
        { status: 403 }
      );
    }

    // Delete all related data
    await Promise.all([
      Session.deleteMany({ userId: id }),
      LoginHistory.deleteMany({ userId: id }),
      Product.deleteMany({ adminId: id }),
      EbayOrder.deleteMany({ adminId: id }),
      TeamMember.deleteMany({ adminId: id }),
      Payment.deleteMany({ userId: id }),
      Account.deleteMany({ userId: id }),
      // Also remove this user if they are a team member
      TeamMember.deleteMany({ userId: id }),
    ]);

    // Delete the user
    await User.findByIdAndDelete(id);

    return Response.json({
      success: true,
      message: "User and all related data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return Response.json(
      { error: "Failed to delete user", details: error.message },
      { status: 500 }
    );
  }
}
