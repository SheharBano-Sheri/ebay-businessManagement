import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import VendorPurchase from "@/models/VendorPurchase";
import Product from "@/models/Product";
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

    // Check if vendor exists
    const vendorToDelete = await Vendor.findById(id);
    if (!vendorToDelete) {
      return Response.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Delete related data
    await Promise.all([
      VendorPurchase.deleteMany({ vendorId: id }),
      // Update products that reference this vendor
      Product.updateMany(
        { vendorId: id },
        { $unset: { vendorId: "" } }
      ),
    ]);

    // Delete the vendor
    await Vendor.findByIdAndDelete(id);

    return Response.json({
      success: true,
      message: "Vendor and all related data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return Response.json(
      { error: "Failed to delete vendor", details: error.message },
      { status: 500 }
    );
  }
}
