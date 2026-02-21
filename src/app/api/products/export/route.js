import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'data' or 'template'
    const adminId = session.user.adminId || session.user.id;

    if (type === "template") {
      // Return CSV template (WooCommerce style with Parent SKU)
      const csvTemplate =
        "Country,SKU,Name,Description,Type,Vendor,Stock,Unit Cost,Listing URL,Parent SKU\n" +
        'USA,TSHIRT-001,Basic T-Shirt,"Comfortable cotton t-shirt",variable,Vendor Name,100,10.00,https://example.com/product,\n' +
        'USA,TSHIRT-001-V1,"Basic T-Shirt - Color: Red, Size: M","Variation of TSHIRT-001",variation,Vendor Name,50,10.00,https://example.com/product,TSHIRT-001\n' +
        'USA,TSHIRT-001-V2,"Basic T-Shirt - Color: Blue, Size: L","Variation of TSHIRT-001",variation,Vendor Name,50,10.00,https://example.com/product,TSHIRT-001\n' +
        'USA,SAMPLE-002,Simple Product,"Standard product description",simple,Vendor Name,20,29.99,https://example.com/product,';

      return new NextResponse(csvTemplate, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition":
            'attachment; filename="inventory-template.csv"',
        },
      });
    } else {
      // Export actual data
      const products = await Product.find({ adminId })
        .populate("vendorId", "name")
        .sort({ createdAt: -1 });

      // Generate CSV from products
      let csv =
        "Country,SKU,Name,Description,Type,Vendor,Stock,Unit Cost,Listing URL,Parent SKU\n";

      products.forEach((product) => {
        const isVariable =
          product.hasVariations && product.variations?.length > 0;
        const parentStock = isVariable
          ? product.variations.reduce((sum, v) => sum + (v.stock || 0), 0)
          : product.stock || 0;

        const row = [
          product.country || "",
          product.sku || "",
          `"${(product.name || "").replace(/"/g, '""')}"`,
          `"${(product.description || "").replace(/"/g, '""')}"`,
          isVariable ? "variable" : product.type || "simple",
          `"${(product.vendorId?.name || "").replace(/"/g, '""')}"`,
          parentStock,
          product.unitCost || 0,
          product.listingUrl || "",
          "",
        ].join(",");
        csv += row + "\n";

        // Add variation rows immediately after the parent
        if (isVariable) {
          product.variations.forEach((v) => {
            const varStr =
              v.attributes && Object.keys(v.attributes).length > 0
                ? Object.entries(v.attributes)
                    .map(([key, val]) => `${key}: ${val}`)
                    .join(", ")
                : `${v.name || "Option"}: ${v.value || "-"}`;

            const varRow = [
              product.country || "",
              v.sku || "",
              `"${product.name} - ${varStr}"`,
              `"Variation of ${product.sku}"`,
              "variation",
              `"${(product.vendorId?.name || "").replace(/"/g, '""')}"`,
              v.stock || 0,
              v.unitCost || 0,
              product.listingUrl || "",
              product.sku, // Assigns the Parent SKU mapping
            ].join(",");
            csv += varRow + "\n";
          });
        }
      });

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="inventory-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error("Export products error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
