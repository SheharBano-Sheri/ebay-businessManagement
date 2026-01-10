import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import EbayOrder from '@/models/EbayOrder';
import Product from '@/models/Product';
import Account from '@/models/Account';
import User from '@/models/User';
import Papa from 'papaparse';
import crypto from 'crypto';

// Helper function to generate file hash from CSV content
function generateFileHash(fileContent) {
  return crypto.createHash('sha256').update(fileContent).digest('hex');
}

// Helper function to detect report type based on headers
function detectReportType(headers) {
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  
  // Check if it's an EXPORTED file from our system (re-upload)
  if (normalizedHeaders.includes('order number') && 
      normalizedHeaders.includes('sourcing cost') && 
      normalizedHeaders.includes('shipping cost') &&
      normalizedHeaders.includes('gross profit')) {
    return 'EXPORTED';
  }
  
  // eBay UK report
  if (normalizedHeaders.includes('regulatory operating fee')) {
    return 'UK';
  }
  // eBay US report
  if (normalizedHeaders.includes('final value fee - variable')) {
    return 'US';
  }
  // Fallback for UK
  if (normalizedHeaders.includes('final value fee – variable')) {
    return 'UK';
  }
  return 'UNKNOWN';
}

// Helper function to calculate fees based on report type
function calculateFees(row, reportType) {
  if (reportType === 'US') {
    const fixedFee = parseFloat(row['Final Value Fee - fixed'] || '0');
    const variableFee = parseFloat(row['Final Value Fee - variable'] || '0');
    return fixedFee + variableFee;
  } else if (reportType === 'UK') {
    const fixedFee = parseFloat(row['Final value fee – fixed'] || '0');
    const variableFee = parseFloat(row['Final value fee – variable'] || '0');
    const regulatoryFee = parseFloat(row['Regulatory operating fee'] || '0');
    return fixedFee + variableFee + regulatoryFee;
  }
  // Fallback
  return parseFloat(row['Fees'] || row['Fee'] || row['fees'] || '0');
}

// Helper function to parse dates flexibly
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const trimmedDate = dateStr.trim();
  
  // Try multiple date formats
  const formats = [
    // MM/DD/YYYY or M/D/YYYY
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: 'MDY' },
    // YYYY-MM-DD
    { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, order: 'YMD' },
    // DD-MM-YYYY or DD/MM/YYYY
    { regex: /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/, order: 'DMY' },
  ];

  for (const format of formats) {
    const match = trimmedDate.match(format.regex);
    if (match) {
      let year, month, day;
      
      if (format.order === 'MDY') {
        // MM/DD/YYYY
        month = parseInt(match[1]);
        day = parseInt(match[2]);
        year = parseInt(match[3]);
      } else if (format.order === 'YMD') {
        // YYYY-MM-DD
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else if (format.order === 'DMY') {
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
      if (date.getFullYear() === year && 
          date.getMonth() === month - 1 && 
          date.getDate() === day) {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const adminId = user.adminId || user._id;
    
    const formData = await request.formData();
    const file = formData.get('file');
    const accountId = formData.get('accountId');
    const replaceMode = formData.get('replaceMode') === 'true';
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!accountId) {
      return NextResponse.json({ error: 'Please select an account first' }, { status: 400 });
    }

    // Verify account belongs to admin
    const account = await Account.findOne({ _id: accountId, adminId });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Read file content
    const text = await file.text();
    
    // Clean the text content - remove BOM and normalize line endings
    const cleanedText = text
      .replace(/^\uFEFF/, '') // Remove BOM
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n');
    
    // Detect delimiter by checking the first line
    const firstLine = cleanedText.split('\n')[0];
    let delimiter = ',';
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    
    if (tabCount > commaCount && tabCount > semicolonCount) {
      delimiter = '\t';
    } else if (semicolonCount > commaCount && semicolonCount > tabCount) {
      delimiter = ';';
    }
    
    console.log(`Detected delimiter: ${delimiter === '\t' ? 'TAB' : delimiter} (tab:${tabCount}, comma:${commaCount}, semicolon:${semicolonCount})`);
    
    // Generate file hash to track this specific CSV file
    const fileHash = generateFileHash(cleanedText);
    console.log('File hash:', fileHash);

    // Check if this exact file has been uploaded before
    const existingOrdersWithHash = await EbayOrder.countDocuments({ 
      adminId, 
      accountId, 
      fileHash 
    });

    if (existingOrdersWithHash > 0) {
      console.log(`Found ${existingOrdersWithHash} existing orders from this file. Deleting them before reupload.`);
      const deleteResult = await EbayOrder.deleteMany({ 
        adminId, 
        accountId, 
        fileHash 
      });
      console.log(`Deleted ${deleteResult.deletedCount} orders from previous upload of this file`);
    }

    // If replace mode is enabled, delete existing orders (legacy behavior for date range deletion)
    if (replaceMode) {
      const deleteQuery = {
        adminId,
        accountId
      };
      
      // If date range is specified, only delete orders in that range
      if (startDate && endDate) {
        deleteQuery.orderDate = {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
        };
        console.log(`Replace mode: Deleting orders from ${startDate} to ${endDate}`);
      } else {
        console.log(`Replace mode: Deleting ALL orders for account ${accountId}`);
      }
      
      const deleteResult = await EbayOrder.deleteMany(deleteQuery);
      console.log(`Replace mode: Deleted ${deleteResult.deletedCount} existing orders`);
    }
    
    const parsed = Papa.parse(cleanedText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      delimiter: delimiter, // Use detected delimiter
      dynamicTyping: false,
      newline: '\n',
      quoteChar: '"',
      escapeChar: '"'
    });

    console.log('CSV parsed:', parsed.data.length, 'rows');
    const headers = Object.keys(parsed.data[0] || {});
    if (parsed.data.length > 0) {
      console.log('CSV Headers:', headers);
      console.log('First row sample:', JSON.stringify(parsed.data[0]).substring(0, 500));
    }

    // Validate CSV is not empty
    if (parsed.data.length === 0) {
      return NextResponse.json({ 
        error: 'CSV file is empty. Please upload a file with order data.',
        validationError: true
      }, { status: 400 });
    }

    // Validate CSV has headers
    if (headers.length === 0) {
      return NextResponse.json({ 
        error: 'CSV file has no headers. Please ensure your CSV has column headers in the first row.',
        validationError: true
      }, { status: 400 });
    }

    // Only fail on critical parsing errors, not field mismatches
    const criticalErrors = parsed.errors.filter(e => 
      e.type !== 'FieldMismatch' && e.code !== 'TooManyFields'
    );
    
    if (criticalErrors.length > 0) {
      console.error('CSV parsing errors:', criticalErrors);
      return NextResponse.json({ 
        error: 'CSV parsing error - unable to read file. Please check the CSV format and encoding.',
        details: criticalErrors.slice(0, 3), // Show first 3 errors
        validationError: true
      }, { status: 400 });
    }
    
    // Just log field mismatch warnings
    if (parsed.errors.length > 0) {
      console.warn('CSV parsing warnings (non-critical):', parsed.errors.length, 'field mismatches');
    }

    // Detect report type for proper fee calculation
    const reportType = detectReportType(headers);
    console.log('Detected report type:', reportType);
    console.log('CSV Headers detected:', headers.join(', '));

    // Don't block upload based on column names - let row-level validation handle it
    // Different eBay regions/versions have different column names
    // The row parsing logic already handles various column name variations

    const ordersToInsert = [];
    const errors = [];
    const orderNumbersToReplace = new Set(); // Track order numbers for replacement

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      
      try {
        let orderNumber, sku, itemName, quantity, orderType, grossAmount, fees, netAmount, description, sourcingCost, shippingCost, currency, orderDate;

        // Handle EXPORTED format (re-uploaded file with costs already filled)
        if (reportType === 'EXPORTED') {
          orderNumber = row['Order Number'] || row['Order number'];
          sku = row['SKU'] || '--';
          itemName = row['Item Name'] || row['Item'] || '--';
          quantity = row['Quantity'] || '1';
          orderType = row['Transaction Type'] || row['Type'] || 'Sale';
          grossAmount = row['Gross Amount'] || '0';
          fees = row['Fees'] || '0';
          sourcingCost = row['Sourcing Cost'] || '0';
          shippingCost = row['Shipping Cost'] || '0';
          currency = row['Currency'] || account.defaultCurrency || 'USD';
          orderDate = row['Date'];
          netAmount = '0';
          description = '';
        } else {
          // Handle eBay report format (original upload)
          // Map eBay CSV columns to schema fields
          // Support multiple eBay column name variations across different regions/versions
          orderNumber = row['Order number'] || 
                        row['Order #'] || 
                        row['Order Number'] || 
                        row['orderNumber'] || 
                        row['order_number'] ||
                        row['Order ID'] ||
                        row['OrderID'] ||
                        row['Sales record number'] ||
                        row['Sales Record Number'] ||
                        row['Extended order ID'] ||
                        row['Extended Order ID'] ||
                        row['Legacy order ID'] ||
                        row['Transaction ID'] ||
                        row['TransactionID'];
          
          // Fallback: If no order number, generate one from Transaction ID or Item ID
          if (!orderNumber || orderNumber.trim() === '') {
            const transactionId = row['Transaction ID'] || row['TransactionID'];
            const itemId = row['Item ID'] || row['ItemID'];
            const legacyId = row['Legacy order ID'];
            
            if (transactionId) {
              orderNumber = transactionId;
            } else if (legacyId) {
              orderNumber = legacyId;
            } else if (itemId) {
              orderNumber = `ITEM-${itemId}`;
            } else {
              // Last resort: generate from row index and timestamp
              orderNumber = `ORD-${Date.now()}-${i}`;
            }
          }
                        
          sku = row['Custom label'] || row['SKU'] || row['sku'] || row['Custom Label'] || '--';
          itemName = row['Item title'] || row['Item'] || row['Title'] || row['itemTitle'] || row['Item Title'] || row['Item ID'] || '--';
          quantity = row['Quantity'] || row['Qty'] || row['quantity'] || '1';
          const rawOrderType = row['Type'] || row['Transaction type'] || row['Order Type'] || row['Transaction Type'] || 'Sale';
          orderType = rawOrderType;
          
          // EXCLUDE PAYOUT TRANSACTIONS (matching reference implementation)
          if (orderType && orderType.trim().toLowerCase() === 'payout') {
            continue; // Skip payout transactions
          }
          
          // Normalize insertion fee transaction types (various formats in eBay reports)
          const normalizedType = orderType.trim().toLowerCase();
          if (normalizedType === 'insertion fee' || 
              normalizedType === 'listing fee' || 
              normalizedType === 'insertion' ||
              normalizedType.includes('insertion fee')) {
            orderType = 'insertion fee'; // Standardize the type
          }
          
          grossAmount = row['Gross transaction amount'] || row['Gross Amount'] || row['Gross'] || row['gross'] || '0';
          
          // Use the smart fee calculation based on report type
          const feesCalculated = calculateFees(row, reportType);
          fees = feesCalculated !== 0 ? feesCalculated : parseFloat(row['Fees'] || row['Fee'] || '0');
          
          netAmount = row['Net amount'] || row['Net Amount'] || '0';
          description = row['Description'] || row['description'] || '';
          sourcingCost = row['Sourcing Cost'] || row['Cost'] || row['sourcing_cost'] || '0';
          shippingCost = row['Postage and packaging'] || row['Shipping Cost'] || row['Shipping'] || row['shipping'] || '0';
          currency = row['Transaction currency'] || row['Currency'] || row['currency'] || account.defaultCurrency || 'USD';
          orderDate = row['Transaction creation date'] || 
                      row['Transaction Creation Date'] ||
                      row['Date'] || 
                      row['Order Date'] || 
                      row['date'] ||
                      row['Created Date'] ||
                      row['Creation Date'];
        }

        // EXCLUDE PAYOUT TRANSACTIONS for all formats
        if (orderType && orderType.trim().toLowerCase() === 'payout') {
          continue;
        }

        // Validate required fields - order number should now always exist due to fallback
        if (!orderNumber || orderNumber.trim() === '') {
          // Log the actual row data to help debug column name issues
          if (errors.length === 0) {
            console.error('Row missing order number after fallback. Available columns:', Object.keys(row));
            console.error('First row data sample:', JSON.stringify(row).substring(0, 300));
          }
          
          errors.push({ 
            row: i + 2,
            error: 'Unable to determine order identifier - no Order Number, Transaction ID, or Item ID found',
            data: { 
              availableColumns: errors.length === 0 ? Object.keys(row).join(', ') : 'See first error'
            }
          });
          continue;
        }

        // Validate date format
        const parsedDate = parseDate(orderDate);
        if (!orderDate || isNaN(parsedDate.getTime())) {
          errors.push({ 
            row: i + 2,
            error: `Invalid date format: "${orderDate}". Expected formats: MM/DD/YYYY, YYYY-MM-DD, or DD-MM-YYYY`,
            data: { 
              orderNumber,
              date: orderDate || '(empty)'
            }
          });
          continue;
        }

        // SKU is only required for Order/Sale transactions, not for fees or other types
        const normalizedType = (orderType || '').toLowerCase().trim();
        if (!sku && (normalizedType === 'order' || normalizedType === 'sale')) {
          errors.push({ 
            row: i + 2,
            error: 'Missing SKU for Order/Sale transaction - SKU is required for sales',
            data: { 
              orderNumber,
              type: orderType,
              sku: '(empty)'
            }
          });
          continue;
        }

        // For insertion fees and other fee transactions, SKU is optional
        // They will use orderNumber as the unique identifier

        const grossAmountValue = parseFloat(grossAmount) || 0;
        const feesValue = Math.abs(parseFloat(fees) || 0); // Store as positive
        const netAmountValue = parseFloat(netAmount) || 0;
        const sourcingCostValue = parseFloat(sourcingCost) || 0;
        const shippingCostValue = parseFloat(shippingCost) || 0;

        // Parse and validate the date
        const parsedOrderDate = parseDate(orderDate);
        if (!parsedOrderDate) {
          errors.push({ 
            row: i + 2,
            error: `Invalid date: "${orderDate}"`,
            data: { orderNumber, date: orderDate }
          });
          continue;
        }

        const orderData = {
          adminId,
          accountId,
          uploadedBy: user._id,
          fileHash, // Track which CSV file this order came from
          orderNumber,
          sku,
          itemName: itemName || 'Untitled Item',
          orderedQty: parseInt(quantity) || 1,
          transactionType: orderType,
          grossAmount: grossAmountValue,
          fees: feesValue, // Now positive
          netAmount: netAmountValue,
          description: description || '',
          sourcingCost: sourcingCostValue,
          shippingCost: shippingCostValue,
          grossProfit: grossAmountValue - feesValue - sourcingCostValue - shippingCostValue, // All positive now
          currency,
          orderDate: parsedOrderDate
        };

        // Try to find matching product by SKU
        if (orderData.sku && orderData.sku !== '--') {
          const product = await Product.findOne({ sku: orderData.sku, adminId });
          if (product) {
            orderData.productId = product._id;
          }
        }

        // Track this order number for replacement
        orderNumbersToReplace.add(orderNumber);
        
        ordersToInsert.push(orderData);
      } catch (error) {
        errors.push({ 
          row: i + 2, 
          error: error.message,
          data: row
        });
      }
    }

    // CRITICAL: Delete existing orders with the same order numbers
    // This ensures reupload replaces data instead of duplicating
    if (orderNumbersToReplace.size > 0) {
      const orderNumbersArray = Array.from(orderNumbersToReplace);
      console.log(`Checking for existing orders with ${orderNumbersArray.length} order numbers...`);
      
      const existingOrdersQuery = {
        adminId,
        accountId,
        orderNumber: { $in: orderNumbersArray }
      };
      
      const existingCount = await EbayOrder.countDocuments(existingOrdersQuery);
      
      if (existingCount > 0) {
        console.log(`Found ${existingCount} existing orders to replace`);
        const deleteResult = await EbayOrder.deleteMany(existingOrdersQuery);
        console.log(`Deleted ${deleteResult.deletedCount} existing orders before inserting new data`);
      }
    }

    // Batch insert all orders at once for speed
    let insertedOrders = [];
    if (ordersToInsert.length > 0) {
      try {
        insertedOrders = await EbayOrder.insertMany(ordersToInsert, { ordered: false });
        console.log(`Batch inserted ${insertedOrders.length} orders`);
      } catch (error) {
        console.error('Batch insert error:', error);
        // If batch fails, handle individual insertion errors
        if (error.writeErrors) {
          error.writeErrors.forEach(err => {
            errors.push({
              row: err.index + 2,
              error: err.errmsg || 'Database insertion failed'
            });
          });
          insertedOrders = error.insertedDocs || [];
        } else {
          // Unknown insertion error
          return NextResponse.json({ 
            error: 'Database error during order insertion. Please try again or contact support.',
            technicalDetails: error.message
          }, { status: 500 });
        }
      }
    }

    console.log(`Upload complete: ${insertedOrders.length} imported, ${errors.length} errors`);

    // If all rows failed, return error response
    if (insertedOrders.length === 0 && errors.length > 0) {
      const errorSummary = errors.slice(0, 5).map(e => `Row ${e.row}: ${e.error}`).join('\n');
      return NextResponse.json({ 
        error: `No orders were imported. Found ${errors.length} error(s) in the CSV file.`,
        errorSummary,
        imported: 0,
        errors: errors.length,
        errorDetails: errors,
        validationError: true
      }, { status: 400 });
    }

    return NextResponse.json({
      message: errors.length > 0 
        ? `CSV upload complete with some errors` 
        : 'CSV upload successful',
      imported: insertedOrders.length,
      errors: errors.length,
      errorDetails: errors,
      success: true
    }, { status: 200 });

  } catch (error) {
    console.error('Upload CSV error:', error);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Internal server error';
    let technicalDetails = error.message;
    
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      errorMessage = 'Database error occurred while saving orders. Please try again.';
    } else if (error.message.includes('File') || error.message.includes('parse')) {
      errorMessage = 'Failed to read or parse CSV file. Please ensure the file is a valid CSV.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Upload timeout. Try uploading a smaller file or check your connection.';
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      technicalDetails,
      validationError: false
    }, { status: 500 });
  }
}
