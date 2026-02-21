import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import Vendor from "@/models/Vendor";

export async function POST(request) {
  try {
    console.log("=== CSV Upload Started ===");
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log("No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User:", session.user.email, "AdminId:", session.user.adminId);

    await connectDB();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      console.log("No file in form data");
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log("File received:", file.name, file.size, "bytes");

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    console.log("Total lines:", lines.length);

    if (lines.length < 2) {
      console.log("CSV file is empty or has no data rows");
      return NextResponse.json(
        { error: "CSV file is empty or invalid" },
        { status: 400 },
      );
    }

    console.log("Header:", lines[0]);

    // Skip header row
    const dataLines = lines.slice(1);

    const adminId = session.user.adminId || session.user.id;

    // Get all vendors for matching based on user role
    let vendors;
    if (session.user.role === "public_vendor") {
      vendors = await Vendor.find({ publicVendorUserId: session.user.id });
    } else if (session.user.role === "master_admin") {
      vendors = await Vendor.find({});
    } else {
      vendors = await Vendor.find({
        $or: [
          { adminId: adminId },
          {
            addedByUsers: adminId,
            vendorType: "public",
            isActive: true,
            approvalStatus: "approved",
          },
        ],
      });
    }

    const vendorMap = new Map();
    vendors.forEach((v) => {
      vendorMap.set(v.name.toLowerCase().trim(), v._id);
      vendorMap.set(v._id.toString(), v._id);
    });

    const results = {
      success: 0,
      failed: 0,
      updated: 0,
      created: 0,
      errors: [],
    };

    const countryCurrencyMap = {
      USA: "USD",
      US: "USD",
      "United States": "USD",
      UK: "GBP",
      "United Kingdom": "GBP",
      Canada: "CAD",
      Australia: "AUD",
      India: "INR",
      Japan: "JPY",
      China: "CNY",
      Germany: "EUR",
      France: "EUR",
      Italy: "EUR",
      Spain: "EUR",
      Netherlands: "EUR",
      Belgium: "EUR",
      Austria: "EUR",
      Switzerland: "CHF",
      Sweden: "SEK",
      Norway: "NOK",
      Denmark: "DKK",
      Poland: "PLN",
      Mexico: "MXN",
      Brazil: "BRL",
      Argentina: "ARS",
      "South Korea": "KRW",
      Singapore: "SGD",
      "Hong Kong": "HKD",
      "New Zealand": "NZD",
      UAE: "AED",
      "Saudi Arabia": "SAR",
      "South Africa": "ZAR",
      Turkey: "TRY",
      Russia: "RUB",
    };

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const line = dataLines[i];
        const fields = parseCSVLine(line);

        if (fields.length < 6) {
          results.errors.push(
            `Row ${i + 2}: Insufficient columns (need at least 6)`,
          );
          results.failed++;
          continue;
        }

        // Added parentSku extraction at index 9
        const [
          country,
          sku,
          name,
          description,
          type,
          vendorIdentifier,
          stock,
          unitCost,
          listingUrl,
          parentSku,
        ] = fields;

        if (!sku || !name) {
          results.errors.push(
            `Row ${i + 2}: Missing required fields (SKU or Name)`,
          );
          results.failed++;
          continue;
        }

        const vendorKey = vendorIdentifier.toLowerCase().trim();
        const vendorId =
          vendorMap.get(vendorKey) || vendorMap.get(vendorIdentifier);

        if (!vendorId) {
          results.errors.push(
            `Row ${i + 2}: Vendor "${vendorIdentifier}" not found.`,
          );
          results.failed++;
          continue;
        }

        const detectedCurrency = country
          ? countryCurrencyMap[country] ||
            countryCurrencyMap[country.trim()] ||
            "USD"
          : "USD";
        const isVariationRow = parentSku && parentSku.trim() !== "";

        // --- SCENARIO 1: IT IS A VARIATION ROW ---
        if (isVariationRow) {
          const pSku = parentSku.trim();
          const existingParent = await Product.findOne({ adminId, sku: pSku });

          if (!existingParent) {
            results.errors.push(
              `Row ${i + 2}: Parent product with SKU "${pSku}" not found for variation "${sku}". Ensure parent row is above variations.`,
            );
            results.failed++;
            continue;
          }

          existingParent.hasVariations = true;
          if (!existingParent.variations) existingParent.variations = [];
          if (!existingParent.variationTypes)
            existingParent.variationTypes = [];

          const varIndex = existingParent.variations.findIndex(
            (v) => v.sku === sku.trim(),
          );

          if (varIndex >= 0) {
            // Update existing variation
            console.log(
              `Row ${i + 2}: Updating existing variation SKU: ${sku}`,
            );
            existingParent.variations[varIndex].stock = parseInt(stock) || 0;
            existingParent.variations[varIndex].unitCost =
              parseFloat(unitCost) || 0;
            results.updated++;
          } else {
            // Create new variation and attempt to parse attributes from the name string
            console.log(
              `Row ${i + 2}: Adding new variation SKU: ${sku} to Parent: ${pSku}`,
            );
            let attributes = {};
            const nameParts = name.split(" - ");

            if (nameParts.length > 1) {
              const attrStr = nameParts.pop(); // e.g., "Color: Red, Size: XL"
              attrStr.split(",").forEach((pair) => {
                const [k, v] = pair.split(":").map((s) => s.trim());
                if (k && v) {
                  attributes[k] = v;
                  if (!existingParent.variationTypes.includes(k)) {
                    existingParent.variationTypes.push(k);
                  }
                }
              });
            }

            // Fallback if parsing failed
            if (Object.keys(attributes).length === 0) {
              const fallbackOption = "Option";
              attributes[fallbackOption] =
                nameParts.length > 1 ? nameParts.pop() : sku.trim();
              if (!existingParent.variationTypes.includes(fallbackOption)) {
                existingParent.variationTypes.push(fallbackOption);
              }
            }

            existingParent.variations.push({
              sku: sku.trim(),
              stock: parseInt(stock) || 0,
              unitCost: parseFloat(unitCost) || 0,
              attributes: attributes,
            });
            results.created++;
          }

          // Automatically roll up the variation stock into the parent row
          existingParent.stock = existingParent.variations.reduce(
            (sum, v) => sum + (Number(v.stock) || 0),
            0,
          );
          existingParent.updatedAt = new Date();

          await existingParent.save();
          results.success++;
          continue; // Skip the rest, we successfully processed the variation!
        }

        // --- SCENARIO 2: IT IS A PARENT OR SIMPLE PRODUCT ROW ---
        const existingProduct = await Product.findOne({
          adminId,
          sku: sku.trim(),
        });
        const isVariableType = type && type.toLowerCase() === "variable";

        if (existingProduct) {
          console.log(`Row ${i + 2}: Updating existing product SKU: ${sku}`);
          existingProduct.country = country || existingProduct.country;
          existingProduct.name = name;
          existingProduct.description =
            description || existingProduct.description;
          existingProduct.type = type || existingProduct.type;
          existingProduct.vendorId = vendorId;

          // Only overwrite stock if it is NOT a variable product, otherwise protect the aggregated stock
          if (
            existingProduct.hasVariations &&
            existingProduct.variations?.length > 0
          ) {
            existingProduct.stock = existingProduct.variations.reduce(
              (sum, v) => sum + (Number(v.stock) || 0),
              0,
            );
          } else {
            existingProduct.stock = parseInt(stock) || 0;
          }

          existingProduct.unitCost = parseFloat(unitCost) || 0;
          existingProduct.listingUrl = listingUrl || existingProduct.listingUrl;
          existingProduct.currency = detectedCurrency;

          if (isVariableType) {
            existingProduct.hasVariations = true;
          }

          existingProduct.updatedAt = new Date();
          await existingProduct.save();
          results.updated++;
        } else {
          console.log(`Row ${i + 2}: Creating new product SKU: ${sku}`);
          const vendor = vendors.find(
            (v) => v._id.toString() === vendorId.toString(),
          );

          let isApproved = false;
          let approvedBy = null;
          let approvedAt = null;
          let approvalStatus = "pending";

          if (vendor) {
            if (
              vendor.vendorType === "private" ||
              vendor.vendorType === "virtual" ||
              (vendor.vendorType === "public" &&
                vendor.autoApproveInventory === true)
            ) {
              isApproved = true;
              approvedBy = session.user.id;
              approvedAt = new Date();
              approvalStatus = "approved";
            } else {
              isApproved = false;
              approvalStatus = "pending";
            }
          }

          await Product.create({
            country,
            sku: sku.trim(),
            name,
            description,
            type: isVariableType ? "variable" : type,
            listingUrl,
            adminId,
            vendorId,
            addedBy: session.user.id,
            stock: isVariableType ? 0 : parseInt(stock) || 0, // Base stock starts at 0 if variable
            unitCost: parseFloat(unitCost) || 0,
            currency: detectedCurrency,
            isActive: true,
            hasVariations: isVariableType,
            variationTypes: isVariableType ? ["Color"] : [],
            variations: [],
            approvalStatus,
            isApproved,
            approvedBy,
            approvedAt,
          });
          results.created++;
        }

        results.success++;
      } catch (error) {
        console.error(`Row ${i + 2} error:`, error);
        results.errors.push(`Row ${i + 2}: ${error.message}`);
        results.failed++;
      }
    }

    const summaryMessage = `Import completed: ${results.success} processed successfully (${results.created} newly created, ${results.updated} updated). ${results.failed} failed rows.`;

    return NextResponse.json(
      {
        message: summaryMessage,
        results: {
          ...results,
          summary: {
            total: results.success + results.failed,
            created: results.created,
            updated: results.updated,
            successful: results.success,
            failed: results.failed,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 },
    );
  }
}

// Helper function to parse CSV line with quoted fields
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}
