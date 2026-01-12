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

// Helper function to detect report type based on headers
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

  // eBay UK report
  if (normalizedHeaders.includes("regulatory operating fee")) {
    return "UK";
  }
  // eBay US report
  if (normalizedHeaders.includes("final value fee - variable")) {
    return "US";
  }
  // Fallback for UK
  if (normalizedHeaders.includes("final value fee – variable")) {
    return "UK";
  }
  return "UNKNOWN";
}

// Helper function to calculate fees based on report type
function calculateFees(row, reportType) {
  if (reportType === "US") {
    const fixedFee = parseFloat(row["Final Value Fee - fixed"] || "0");
    const variableFee = parseFloat(row["Final Value Fee - variable"] || "0");
    return fixedFee + variableFee;
  } else if (reportType === "UK") {
    const fixedFee = parseFloat(row["Final value fee – fixed"] || "0");
    const variableFee = parseFloat(row["Final value fee – variable"] || "0");
    const regulatoryFee = parseFloat(row["Regulatory operating fee"] || "0");
    return fixedFee + variableFee + regulatoryFee;
  }
  // Fallback
  return parseFloat(row["Fees"] || row["Fee"] || row["fees"] || "0");
}

// Helper function to parse dates flexibly
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === "") return null;

  const trimmedDate = dateStr.trim();

  // Try multiple date formats
  const formats = [
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

      if (format.order === "MDY") {
        // MM/DD/YYYY
        month = parseInt(match[1]);
        day = parseInt(match[2]);
        year = parseInt(match[3]);
      } else if (format.order === "YMD") {
        // YYYY-MM-DD
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else if (format.order === "DMY") {
        // DD-MM-YYYY
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
      }

      // Validate month and day ranges
      if (month < 1 || month > 12) return null;
      if (day < 1 || day > 31) return null;
      if (year < 1900 || year > 2100) return null;

      const date = new Date(year, month - 1, day);

      // Verify the date is valid (handles things like Feb 31)
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }
      return null;
    }
  }

  // Fallback to standard Date parsing
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
        { status: 400 }
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
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/\r/g, "\n");

    // Detect delimiter by checking the first line
    const firstLine = cleanedText.split("\n")[0];
    let delimiter = ",";
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;

    if (tabCount > commaCount && tabCount > semicolonCount) {
      delimiter = "\t";
    } else if (semicolonCount > commaCount && semicolonCount > tabCount) {
      delimiter = ";";
    }

    console.log(
      `Detected delimiter: ${
        delimiter === "\t" ? "TAB" : delimiter
      } (tab:${tabCount}, comma:${commaCount}, semicolon:${semicolonCount})`
    );

    // Generate file hash to track this specific CSV file
    const fileHash = generateFileHash(cleanedText);
    console.log("File hash:", fileHash);

    // Check if this exact file has been uploaded before
    const existingOrdersWithHash = await EbayOrder.countDocuments({
      adminId,
      accountId,
      fileHash,
    });

    if (existingOrdersWithHash > 0) {
      console.log(
        `Found ${existingOrdersWithHash} existing orders from this file. Deleting them before reupload.`
      );
      const deleteResult = await EbayOrder.deleteMany({
        adminId,
        accountId,
        fileHash,
      });
      console.log(
        `Deleted ${deleteResult.deletedCount} orders from previous upload of this file`
      );
    }

    // If replace mode is enabled, delete existing orders (legacy behavior for date range deletion)
    if (replaceMode) {
      const deleteQuery = {
        adminId,
        accountId,
      };

      // If date range is specified, only delete orders in that range
      if (startDate && endDate) {
        deleteQuery.orderDate = {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        };
        console.log(
          `Replace mode: Deleting orders from ${startDate} to ${endDate}`
        );
      } else {
        console.log(
          `Replace mode: Deleting ALL orders for account ${accountId}`
        );
      }

      const deleteResult = await EbayOrder.deleteMany(deleteQuery);
      console.log(
        `Replace mode: Deleted ${deleteResult.deletedCount} existing orders`
      );
    }

    const parsed = Papa.parse(cleanedText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      delimiter: delimiter, // Use detected delimiter
      dynamicTyping: false,
      newline: "\n",
      quoteChar: '"',
      escapeChar: '"',
    });

    console.log("CSV parsed:", parsed.data.length, "rows");
    const headers = Object.keys(parsed.data[0] || {});
    if (parsed.data.length > 0) {
      console.log("CSV Headers:", headers);
      console.log(
        "First row sample:",
        JSON.stringify(parsed.data[0]).substring(0, 500)
      );
    }

    // Validate CSV is not empty
    if (parsed.data.length === 0) {
      return NextResponse.json(
        {
          error: "CSV file is empty. Please upload a file with order data.",
          validationError: true,
        },
        { status: 400 }
      );
    }

    // Validate CSV has headers
    if (headers.length === 0) {
      return NextResponse.json(
        {
          error:
            "CSV file has no headers. Please ensure your CSV has column headers in the first row.",
          validationError: true,
        },
        { status: 400 }
      );
    }

    // Only fail on critical parsing errors, not field mismatches
    const criticalErrors = parsed.errors.filter(
      (e) => e.type !== "FieldMismatch" && e.code !== "TooManyFields"
    );

    if (criticalErrors.length > 0) {
      console.error("CSV parsing errors:", criticalErrors);
      return NextResponse.json(
        {
          error:
            "CSV parsing error - unable to read file. Please check the CSV format and encoding.",
          details: criticalErrors.slice(0, 3), // Show first 3 errors
          validationError: true,
        },
        { status: 400 }
      );
    }

    // Just log field mismatch warnings
    if (parsed.errors.length > 0) {
      console.warn(
        "CSV parsing warnings (non-critical):",
        parsed.errors.length,
        "field mismatches"
      );
    }

    // Detect report type for proper fee calculation
    const reportType = detectReportType(headers);
    console.log("Detected report type:", reportType);
    console.log("CSV Headers detected:", headers.join(", "));

    const ordersToInsert = [];
    const errors = [];
    const orderNumbersToReplace = new Set();

    // Group rows by Order Number to handle multiple lines (Order, Fees, Refunds)
    const orderGroups = new Map();

    // First Pass: Grouping
    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      let orderNumber;

      if (reportType === "EXPORTED") {
        orderNumber = row["Order Number"] || row["Order number"];
      } else {
        orderNumber =
          row["Order number"] ||
          row["Order #"] ||
          row["Order Number"] ||
          row["orderNumber"] ||
          row["order_number"] ||
          row["Order ID"] ||
          row["OrderID"] ||
          row["Sales record number"] ||
          row["Sales Record Number"] ||
          row["Extended order ID"] ||
          row["Extended Order ID"] ||
          row["Legacy order ID"] ||
          row["Transaction ID"] ||
          row["TransactionID"];

        // Fallback for Order Number
        if (!orderNumber || orderNumber.trim() === "") {
          const transactionId = row["Transaction ID"] || row["TransactionID"];
          const itemId = row["Item ID"] || row["ItemID"];
          const legacyId = row["Legacy order ID"];

          if (transactionId) orderNumber = transactionId;
          else if (legacyId) orderNumber = legacyId;
          else if (itemId) orderNumber = `ITEM-${itemId}`;
        }
      }

      // Skip payouts immediately
      const rawOrderType =
        row["Type"] ||
        row["Transaction type"] ||
        row["Order Type"] ||
        row["Transaction Type"] ||
        "Sale";
      if (rawOrderType && rawOrderType.trim().toLowerCase() === "payout") {
        continue;
      }

      if (orderNumber) {
        if (!orderGroups.has(orderNumber)) {
          orderGroups.set(orderNumber, []);
        }
        orderGroups.get(orderNumber).push({ ...row, originalIndex: i });
      } else {
        // If we still can't find an order number, log error
        errors.push({
          row: i + 2,
          error: "Unable to determine order identifier",
          data: row,
        });
      }
    }

    console.log(`Grouped into ${orderGroups.size} unique orders`);

    // Second Pass: Processing Groups
    for (const [orderNumber, rows] of orderGroups) {
      try {
        // Find the "Main" row - usually the first one, but we'll scan for data
        let mainRow = rows[0];

        // AGGREGATION VARIABLES
        let totalGross = 0;
        let totalFees = 0;
        let totalNet = 0;
        let totalSourcingCost = 0;
        let totalShippingCost = 0; // Seller's expense
        let totalInsertionFee = 0;

        // METADATA VARIABLES - Scan ALL rows to find these
        let sku = "--";
        let itemName = "--";
        let quantity = "1";
        let orderType = "Sale";
        let currency = account.defaultCurrency || "USD";
        let orderDate = null;
        let description = "";

        // SCAN GROUP FOR METADATA
        // We look through every row in the group to find the best values
        for (const r of rows) {
          // Look for SKU
          const rSku =
            r["Custom label"] || r["SKU"] || r["sku"] || r["Custom Label"];
          if (rSku && rSku !== "--" && rSku.trim() !== "") sku = rSku;

          // Look for Item Name
          const rName =
            r["Item title"] ||
            r["Item"] ||
            r["Title"] ||
            r["itemTitle"] ||
            r["Item Title"] ||
            r["Item ID"];
          if (rName && rName !== "--" && rName.trim() !== "") itemName = rName;

          // Look for Quantity
          const rQty = r["Quantity"] || r["Qty"] || r["quantity"];
          if (rQty && rQty !== "0") quantity = rQty;

          // Look for Date
          const rDate =
            r["Transaction creation date"] ||
            r["Transaction Creation Date"] ||
            r["Date"] ||
            r["Order Date"] ||
            r["date"];
          if (rDate) orderDate = rDate;

          // Look for Currency
          const rCurr =
            r["Transaction currency"] || r["Currency"] || r["currency"];
          if (rCurr) currency = rCurr;

          // Look for Type (prioritize Order/Sale)
          const rType = r["Type"] || r["Transaction type"] || r["Order Type"];
          if (
            rType &&
            (rType.toLowerCase() === "order" || rType.toLowerCase() === "sale")
          ) {
            orderType = rType;
          }
        }

        // Fallback for metadata if loop didn't find specific ones
        if (sku === "--")
          sku = mainRow["Custom label"] || mainRow["SKU"] || "--";
        if (itemName === "--")
          itemName = mainRow["Item title"] || mainRow["Item"] || "--";
        if (!orderDate)
          orderDate = mainRow["Date"] || mainRow["Transaction creation date"];

        if (reportType === "EXPORTED") {
          // Logic for re-uploaded files (trust the file contents)
          orderType = mainRow["Transaction Type"] || mainRow["Type"] || "Sale";

          // Sum up values from all rows
          rows.forEach((r) => {
            totalGross += parseFloat(r["Gross Amount"] || "0");
            totalFees += parseFloat(r["Fees"] || "0");
            totalSourcingCost += parseFloat(r["Sourcing Cost"] || "0");
            totalShippingCost += parseFloat(r["Shipping Cost"] || "0");
          });
          totalNet =
            totalGross - totalFees - totalSourcingCost - totalShippingCost;
        } else {
          // Logic for Raw eBay Reports
          // Normalize insertion fee type if needed
          const normalizedType = (orderType || "").trim().toLowerCase();
          if (
            normalizedType.includes("insertion fee") ||
            normalizedType === "insertion"
          ) {
            orderType = "insertion fee";
          }

          description = mainRow["Description"] || "";

          // AGGREGATION LOGIC
          rows.forEach((r) => {
            const rGross = parseFloat(
              r["Gross transaction amount"] ||
                r["Gross Amount"] ||
                r["Gross"] ||
                r["gross"] ||
                "0"
            );
            const rNet = parseFloat(r["Net amount"] || r["Net Amount"] || "0");

            // Calculate Fees for this row
            let rFees = 0;
            const calculatedFees = calculateFees(r, reportType);
            if (calculatedFees !== 0) {
              rFees = calculatedFees;
            } else {
              rFees = parseFloat(r["Fees"] || r["Fee"] || "0");
            }

            totalGross += rGross;
            totalNet += rNet;
            totalFees += Math.abs(rFees);

            // Check for Sourcing Cost in CSV (rare, but possible)
            totalSourcingCost += parseFloat(
              r["Sourcing Cost"] || r["Cost"] || r["sourcing_cost"] || "0"
            );

            // SHIPPING COST FIX: Only map if explicitly named 'Shipping Cost' (Expense)
            if (r["Shipping Cost (Expense)"]) {
              totalShippingCost += parseFloat(r["Shipping Cost (Expense)"]);
            }

            // Insertion Fee / Tax Mapping
            // Map 'eBay collected tax' to insertionFee as requested
            const rTax = parseFloat(
              (r["eBay collected tax"] === "--"
                ? "0"
                : r["eBay collected tax"]) || "0"
            );
            totalInsertionFee += rTax;
          });

          // Re-align Fees to ensure Gross - Fees = Net
          // This handles the complexity of multiple rows automatically
          totalFees = totalGross - totalNet;
        }

        // Validate Date
        const parsedOrderDate = parseDate(orderDate);
        if (!parsedOrderDate) {
          errors.push({
            row: mainRow.originalIndex + 2,
            error: `Invalid date: "${orderDate}"`,
            data: { orderNumber, date: orderDate },
          });
          continue;
        }

        const orderData = {
          adminId,
          accountId,
          uploadedBy: user._id,
          fileHash,
          orderNumber,
          sku,
          itemName: itemName || "Untitled Item",
          orderedQty: parseInt(quantity) || 1,
          transactionType: orderType,
          grossAmount: totalGross,
          fees: Math.abs(totalFees), // Store as positive
          insertionFee: totalInsertionFee,
          netAmount: totalNet,
          description: description || "",
          sourcingCost: totalSourcingCost,
          shippingCost: totalShippingCost,
          grossProfit: totalNet - totalSourcingCost - totalShippingCost,
          currency,
          orderDate: parsedOrderDate,
        };

        // Try to find matching product by SKU to update Sourcing Cost if not in CSV
        if (orderData.sku && orderData.sku !== "--") {
          const product = await Product.findOne({
            sku: orderData.sku,
            adminId,
          });
          if (product) {
            orderData.productId = product._id;
            // Only overwrite sourcing cost if it wasn't in the CSV (which is 0 usually)
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
      } catch (err) {
        errors.push({
          row: (rows[0]?.originalIndex || 0) + 2,
          error: err.message,
          data: rows[0],
        });
      }
    }

    // CRITICAL: Delete existing orders with the same order numbers
    if (orderNumbersToReplace.size > 0) {
      const orderNumbersArray = Array.from(orderNumbersToReplace);
      console.log(
        `Checking for existing orders with ${orderNumbersArray.length} order numbers...`
      );

      const existingOrdersQuery = {
        adminId,
        accountId,
        orderNumber: { $in: orderNumbersArray },
      };

      const existingCount = await EbayOrder.countDocuments(existingOrdersQuery);

      if (existingCount > 0) {
        console.log(`Found ${existingCount} existing orders to replace`);
        const deleteResult = await EbayOrder.deleteMany(existingOrdersQuery);
        console.log(
          `Deleted ${deleteResult.deletedCount} existing orders before inserting new data`
        );
      }
    }

    // Batch insert all orders at once for speed
    let insertedOrders = [];
    if (ordersToInsert.length > 0) {
      try {
        insertedOrders = await EbayOrder.insertMany(ordersToInsert, {
          ordered: false,
        });
        console.log(`Batch inserted ${insertedOrders.length} orders`);
      } catch (error) {
        console.error("Batch insert error:", error);
        // If batch fails, handle individual insertion errors
        if (error.writeErrors) {
          error.writeErrors.forEach((err) => {
            errors.push({
              row: err.index + 2,
              error: err.errmsg || "Database insertion failed",
            });
          });
          insertedOrders = error.insertedDocs || [];
        } else {
          // Unknown insertion error
          return NextResponse.json(
            {
              error:
                "Database error during order insertion. Please try again or contact support.",
              technicalDetails: error.message,
            },
            { status: 500 }
          );
        }
      }
    }

    console.log(
      `Upload complete: ${insertedOrders.length} imported, ${errors.length} errors`
    );

    // If all rows failed, return error response
    if (insertedOrders.length === 0 && errors.length > 0) {
      const errorSummary = errors
        .slice(0, 5)
        .map((e) => `Row ${e.row}: ${e.error}`)
        .join("\n");
      return NextResponse.json(
        {
          error: `No orders were imported. Found ${errors.length} error(s) in the CSV file.`,
          errorSummary,
          imported: 0,
          errors: errors.length,
          errorDetails: errors,
          validationError: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message:
          errors.length > 0
            ? `CSV upload complete with some errors`
            : "CSV upload successful",
        imported: insertedOrders.length,
        errors: errors.length,
        errorDetails: errors,
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload CSV error:", error);

    // Provide more specific error messages based on error type
    let errorMessage = "Internal server error";
    let technicalDetails = error.message;

    if (error.name === "MongoError" || error.name === "MongoServerError") {
      errorMessage =
        "Database error occurred while saving orders. Please try again.";
    } else if (
      error.message.includes("File") ||
      error.message.includes("parse")
    ) {
      errorMessage =
        "Failed to read or parse CSV file. Please ensure the file is a valid CSV.";
    } else if (error.message.includes("timeout")) {
      errorMessage =
        "Upload timeout. Try uploading a smaller file or check your connection.";
    }

    return NextResponse.json(
      {
        error: errorMessage,
        technicalDetails,
        validationError: false,
      },
      { status: 500 }
    );
  }
}
