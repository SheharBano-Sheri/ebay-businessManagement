import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendEmail } from "@/lib/email"; // Assuming you have this helper

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a master admin
    if (!session || session.user.role !== "master_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user status
    user.planApprovalStatus = "approved";
    user.isActive = true;
    user.vendorApprovalStatus = "approved"; // Also approve their vendor status if applicable

    await user.save();

    // Optional: Send email notification to user
    try {
      // You can implement this if you have the email system set up
      await sendEmail({
        to: user.email,
        subject: 'Your Account has been Approved',
        text: `Hello ${user.name},\n\nYour Enterprise account has been approved by the administrator. You can now log in.`
      });
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError);
    }

    return NextResponse.json({ message: "User approved successfully", user });
  } catch (error) {
    console.error("Error approving user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
