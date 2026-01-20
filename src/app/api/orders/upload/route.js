import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import EbayOrder from "@/models/EbayOrder";
import Product from "@/models/Product";
import Account from "@/models/Account";
import User from "@/models/User";
import Papa from "papaparse";
import crypto from "crypto";

// Helper function to generate file hash from CSV content
function generateFileHash(fileContent) {
  return crypto.createHash("sha256").update(fileContent).digest("hex");
}

// Helper: Get value from row case-insensitively
function getValue(row, columnName) {
  if (!row) return undefined;
  const lowerCol = columnName.toLowerCase().trim();
  const keys = Object.keys(row);
  const foundKey = keys.find((k) => k.toLowerCase().trim() === lowerCol);
  return foundKey ? row[foundKey] : undefined;
}

// Helper: Detect report type based on headers
function detectReportType(headers) {
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());

  // Check if it's an EXPORTED file from our system (re-upload)
  if (
    normalizedHeaders.includes("order number") &&
    normalizedHeaders.includes("sourcing cost") &&
    normalizedHeaders.includes("shipping cost") &&
    normalizedHeaders.includes("gross profit")
  ) {
    return "EXPORTED";
  }

  // DETECT COST UPDATE TEMPLATE
  if (
    (normalizedHeaders.includes("order #") ||
      normalizedHeaders.includes("order number")) &&
    normalizedHeaders.includes("sourcing cost") &&
    normalizedHeaders.includes("shipping cost") &&
    !normalizedHeaders.includes("gross profit")
  ) {
    return "COST_UPDATE";
  }

  return "EBAY_REPORT";
}

// Helper: Parse fees from a row (Summing specific columns AB-AG)
function sumFeeColumns(row) {
  const feeColumns = [
    "Final value fee - fixed",
    "Final value fee – fixed", // Handle en-dash
    "Final value fee - variable",
    "Final value fee – variable",
    "Regulatory operating fee",
    "Very high 'item not as described' fee",
    "Below standard performance fee",
    "International fee",
  ];

  let total = 0;
  feeColumns.forEach((col) => {
    const val = getValue(row, col);
    if (val && val !== "--") {
      total += parseFloat(val) || 0;
    }
  });
  return total;
}

// Helper function to parse dates flexibly
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === "") return null;

  const trimmedDate = dateStr.trim();

  // Try multiple date formats
  const formats = [
    // DD-MMM-YY (e.g., 18-Dec-25) - Common in eBay UK reports
    { regex: /^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/, order: "DMMonY" },
    // MM/DD/YYYY or M/D/YYYY
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: "MDY" },
    // YYYY-MM-DD
    { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, order: "YMD" },
    // DD-MM-YYYY or DD/MM/YYYY
    { regex: /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/, order: "DMY" },
  ];

  for (const format of formats) {
    const match = trimmedDate.match(format.regex);
    if (match) {
      let year, month, day;

      if (format.order === "DMMonY") {
        day = parseInt(match[1]);
        const monthName = match[2].toLowerCase();
        const months = {
          jan: 1,
          feb: 2,
          mar: 3,
          apr: 4,
          may: 5,
          jun: 6,
          jul: 7,
          aug: 8,
          sep: 9,
          oct: 10,
          nov: 11,
          dec: 12,
        };
        month = months[monthName];
        year = parseInt(match[3]);
        // Handle 2-digit year (e.g., 25 -> 2025)
        if (year < 100) year += 2000;
      } else if (format.order === "MDY") {
        month = parseInt(match[1]);
        day = parseInt(match[2]);
        year = parseInt(match[3]);
      } else if (format.order === "YMD") {
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else if (format.order === "DMY") {
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
      }

      if (month < 1 || month > 12) return null;
      if (day < 1 || day > 31) return null;

      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) return date;
    }
  }

  const date = new Date(trimmedDate);
  return isNaN(date.getTime()) ? null : date;
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const adminId = user.adminId || user._id;

    const formData = await request.formData();
    const file = formData.get("file");
    const accountId = formData.get("accountId");
    const replaceMode = formData.get("replaceMode") === "true";
    const startDate = formData.get("startDate");
    const endDate = formData.get("endDate");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!accountId) {
      return NextResponse.json(
        { error: "Please select an account first" },
        { status: 400 },
      );
    }

    // Verify account belongs to admin
    const account = await Account.findOne({ _id: accountId, adminId });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Read file content
    const text = await file.text();

    // Clean the text content - remove BOM and normalize line endings
    const cleanedText = text
      .replace(/^\uFEFF/, "") // Remove BOM
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    const fileHash = generateFileHash(cleanedText);

    // Use PapaParse with auto-detect delimiter for better reliability
    const parsed = Papa.parse(cleanedText, {
      header: true,
      skipEmptyLines: true,
      delimiter: "", // Auto-detect delimiter
      transformHeader: (header) => header.trim(), // Keep headers cleaner
      dynamicTyping: false,
      newline: "\n",
    });

    if (parsed.data.length === 0) {
      return NextResponse.json(
        {
          error: "CSV file is empty or could not be parsed.",
          validationError: true,
        },
        { status: 400 },
      );
    }

    const headers = Object.keys(parsed.data[0] || {});
    const reportType = detectReportType(headers);
    console.log("Detected report type:", reportType);

    // --- HANDLE COST UPDATE UPLOAD ---
    if (reportType === "COST_UPDATE") {
      const updates = [];
      const errors = [];

      for (let i = 0; i < parsed.data.length; i++) {
        const row = parsed.data[i];
        const orderNumber =
          getValue(row, "Order #") || getValue(row, "Order Number");

        if (!orderNumber) continue;

        const sourcingCost = parseFloat(getValue(row, "Sourcing Cost") || "0");
        const shippingCost = parseFloat(getValue(row, "Shipping Cost") || "0");

        if (isNaN(sourcingCost) || isNaN(shippingCost)) {
          errors.push({ row: i + 2, error: "Invalid cost format", data: row });
          continue;
        }

        updates.push({
          updateOne: {
            filter: {
              orderNumber: orderNumber,
              adminId: adminId,
              accountId: accountId,
            },
            update: [
              {
                $set: {
                  sourcingCost: sourcingCost,
                  shippingCost: shippingCost,
                },
              },
              {
                $set: {
                  grossProfit: {
                    $subtract: [
                      "$grossAmount",
                      { $add: ["$fees", sourcingCost, shippingCost] },
                    ],
                  },
                },
              },
            ],
          },
        });
      }

      if (updates.length > 0) {
        try {
          const result = await EbayOrder.bulkWrite(updates);
          return NextResponse.json(
            {
              message: `Updated costs for ${result.modifiedCount} orders successfully!`,
              imported: result.modifiedCount,
              errors: errors.length,
              errorDetails: errors,
              success: true,
            },
            { status: 200 },
          );
        } catch (error) {
          console.error("Bulk update error:", error);
          return NextResponse.json(
            {
              error: "Failed to update orders",
              technicalDetails: error.message,
            },
            { status: 500 },
          );
        }
      } else {
        return NextResponse.json(
          { error: "No valid rows found to update", validationError: true },
          { status: 400 },
        );
      }
    }

    // --- STANDARD UPLOADS ---

    // Clean up existing file hash matches
    const existingOrdersWithHash = await EbayOrder.countDocuments({
      adminId,
      accountId,
      fileHash,
    });

    if (existingOrdersWithHash > 0) {
      await EbayOrder.deleteMany({ adminId, accountId, fileHash });
    }

    if (replaceMode) {
      const deleteQuery = { adminId, accountId };
      if (startDate && endDate) {
        deleteQuery.orderDate = {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        };
      }
      await EbayOrder.deleteMany(deleteQuery);
    }

    const orderGroups = new Map();
    const errors = [];
    const orderNumbersToReplace = new Set();

    // --- FIRST PASS: GROUPING ---
    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];

      // Strict Check: Ignore Payout rows to prevent incorrect linking
      const rowType = (
        getValue(row, "Type") ||
        getValue(row, "Transaction type") ||
        ""
      ).trim();

      if (rowType.toLowerCase() === "payout") {
        continue; // Skip payouts entirely
      }

      let orderNumber;

      if (reportType === "EXPORTED") {
        orderNumber =
          getValue(row, "Order Number") || getValue(row, "Order number");
      } else {
        // Standard eBay Report
        orderNumber =
          getValue(row, "Order number") || getValue(row, "Order Number");

        // Skip rows that don't have a valid order number
        if (!orderNumber || orderNumber === "--" || orderNumber.trim() === "") {
          continue;
        }
      }

      if (orderNumber) {
        if (!orderGroups.has(orderNumber)) {
          orderGroups.set(orderNumber, []);
        }
        orderGroups.get(orderNumber).push({ ...row, originalIndex: i });
      }
    }

    const ordersToInsert = [];

    // --- SECOND PASS: PROCESSING GROUPS ---
    for (const [orderNumber, rows] of orderGroups) {
      try {
        // Find the "Order" row (Main row)
        const orderRow = rows.find((r) => {
          const t = (
            getValue(r, "Type") ||
            getValue(r, "Transaction type") ||
            ""
          )
            .trim()
            .toLowerCase();
          return t === "order" || t === "sale";
        });

        // If no main order row found in this group (e.g. only orphaned fees), skip
        if (!orderRow && reportType !== "EXPORTED") {
          continue;
        }

        const mainRow = orderRow || rows[0];

        // Metadata
        const sku =
          getValue(mainRow, "Custom label") || getValue(mainRow, "SKU") || "--";
        const itemName =
          getValue(mainRow, "Item title") ||
          getValue(mainRow, "Item Title") ||
          "Untitled Item";
        const quantity = getValue(mainRow, "Quantity") || "1";
        const orderDateStr =
          getValue(mainRow, "Transaction creation date") ||
          getValue(mainRow, "Date");
        const orderDate = parseDate(orderDateStr);

        if (!orderDate) {
          errors.push({
            row: mainRow.originalIndex + 2,
            error: `Invalid Date: ${orderDateStr}`,
            data: mainRow,
          });
          continue;
        }

        let totalGross = 0;
        let totalFees = 0;
        let totalNet = 0;
        let totalSourcingCost = 0;
        let totalShippingCost = 0;

        if (reportType === "EXPORTED") {
          rows.forEach((r) => {
            totalGross += parseFloat(getValue(r, "Gross Amount") || "0");
            totalFees += parseFloat(getValue(r, "Fees") || "0");
            totalSourcingCost += parseFloat(
              getValue(r, "Sourcing Cost") || "0",
            );
            totalShippingCost += parseFloat(
              getValue(r, "Shipping Cost") || "0",
            );
          });
          totalNet =
            totalGross - totalFees - totalSourcingCost - totalShippingCost;
        } else {
          // --- NEW CALCULATION LOGIC ---

          // 1. Get Exchange Rate from "Order" row
          const exchangeRateStr = getValue(mainRow, "Exchange rate");
          const exchangeRate =
            exchangeRateStr &&
            exchangeRateStr.trim() !== "" &&
            exchangeRateStr !== "--"
              ? parseFloat(exchangeRateStr)
              : 1.0;

          // 2. Gross Amount: Pick from AH (Gross transaction amount) of the ORDER row
          // And multiply by Exchange Rate
          const rawGrossAmount = parseFloat(
            getValue(mainRow, "Gross transaction amount") ||
              getValue(mainRow, "Gross Amount") ||
              "0",
          );
          totalGross = rawGrossAmount * exchangeRate;

          // 3. Fee Calculation

          // A) Sum fee columns from the Order Row (AB-AG)
          const orderFeesNative = sumFeeColumns(mainRow);
          // Convert Order Fees to Payout Currency
          const orderFeesConverted = orderFeesNative * exchangeRate;

          // B) Add "Other fee" rows (e.g. Promoted Listings)
          // For Other Fee rows, "Net amount" (Col K) is already in Payout Currency
          // (In Intl: Net is GBP, Gross is USD. In Domestic: Net is GBP, Gross is GBP)
          let otherFeesTotal = 0;
          rows.forEach((r) => {
            const rType = (getValue(r, "Type") || "").trim().toLowerCase();
            if (rType === "other fee") {
              otherFeesTotal += parseFloat(getValue(r, "Net amount") || "0");
            }
          });

          // Calculate Total Fees (Absolute Value)
          // Fees in CSV are negative. We sum them up and take Abs for DB storage.
          // Example: OrderFees(-23.68) + OtherFees(-9.24) = -32.92 -> 32.92
          totalFees = Math.abs(orderFeesConverted + otherFeesTotal);

          // 4. Expenses (Sourcing / Shipping)
          rows.forEach((r) => {
            // Only add explicitly marked Expenses (rare in standard eBay reports)
            const shipExp = getValue(r, "Shipping Cost (Expense)");
            if (shipExp) {
              totalShippingCost += parseFloat(shipExp);
            }
            totalSourcingCost += parseFloat(
              getValue(r, "Sourcing Cost") || "0",
            );
          });

          // 5. Net Amount & Gross Profit
          // Net Amount = Gross - Fees (Since totalFees is positive, we subtract it)
          totalNet = totalGross - totalFees;

          // Gross Profit = Net - Sourcing - Shipping
          const grossProfit = totalNet - totalSourcingCost - totalShippingCost;

          const orderData = {
            adminId,
            accountId,
            uploadedBy: user._id,
            fileHash,
            orderNumber,
            sku,
            itemName,
            orderedQty: parseInt(quantity) || 1,
            transactionType: "Sale",
            grossAmount: totalGross,
            fees: totalFees,
            netAmount: totalNet,
            description: getValue(mainRow, "Description") || "",
            sourcingCost: totalSourcingCost,
            shippingCost: totalShippingCost,
            grossProfit: grossProfit,
            currency: account.defaultCurrency || "GBP",
            orderDate,
          };

          // --- SOURCING COST LOOKUP ---
          if (orderData.sku && orderData.sku !== "--") {
            const product = await Product.findOne({
              sku: orderData.sku,
              adminId,
            });
            if (product) {
              orderData.productId = product._id;
              if (orderData.sourcingCost === 0 && product.sourcingPrice) {
                orderData.sourcingCost =
                  product.sourcingPrice * orderData.orderedQty;
                // Recalculate profit
                orderData.grossProfit =
                  orderData.netAmount -
                  orderData.sourcingCost -
                  orderData.shippingCost;
              }
            }
          }

          orderNumbersToReplace.add(orderNumber);
          ordersToInsert.push(orderData);
        }
      } catch (err) {
        errors.push({
          row: (rows[0]?.originalIndex || 0) + 2,
          error: err.message,
          data: rows[0],
        });
      }
    }

    if (orderNumbersToReplace.size > 0) {
      const orderNumbersArray = Array.from(orderNumbersToReplace);
      await EbayOrder.deleteMany({
        adminId,
        accountId,
        orderNumber: { $in: orderNumbersArray },
      });
    }

    let insertedOrders = [];
    if (ordersToInsert.length > 0) {
      try {
        insertedOrders = await EbayOrder.insertMany(ordersToInsert, {
          ordered: false,
        });
      } catch (e) {
        console.error("Insertion error:", e);
        return NextResponse.json(
          { error: "Database insertion failed", technicalDetails: e.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        message:
          errors.length > 0
            ? `CSV upload complete. Imported ${insertedOrders.length} orders. Found ${errors.length} errors.`
            : "CSV upload successful",
        imported: insertedOrders.length,
        errors: errors.length,
        errorDetails: errors,
        success: true,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Upload CSV error:", error);
    return NextResponse.json(
      { error: "Internal server error", technicalDetails: error.message },
      { status: 500 },
    );
  }
}
