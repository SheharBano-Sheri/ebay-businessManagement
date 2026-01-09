# CSV Upload Guide

## Overview
This guide explains how to upload your eBay order data via CSV files into the system.

## 🔄 CSV Reupload & Duplicate Prevention

### Automatic Duplicate Detection
The system **automatically prevents duplicate orders** when you reupload the same CSV file:

- Each CSV file is uniquely identified by its content hash
- When you upload a CSV file, the system checks if it has been uploaded before
- If the same file is detected (even with updated data), **all orders from the previous upload are automatically deleted**
- The new data from the CSV replaces the old data completely
- You can safely reupload the same CSV file multiple times without creating duplicates

### How It Works
1. **First Upload**: CSV is processed → Orders are created with a unique file identifier
2. **Reupload**: System detects the same file → Deletes previous orders → Inserts updated orders
3. **Result**: No duplicates, only the latest data from the CSV

### Insertion Fee Handling
eBay CSV reports include insertion fees (listing fees) in **Column Z** as separate transaction rows:

- **Transaction Type**: `insertion fee`, `listing fee`, or `Insertion`
- These are automatically processed as separate transactions
- **One calculation per upload**: Insertion fees are calculated once when the CSV is uploaded
- **No duplication**: Reuploading the same CSV does not re-add or re-calculate insertion fees
- They appear in your orders list with the transaction type clearly marked

### Benefits
- ✅ **No manual cleanup needed** - System handles it automatically
- ✅ **Data integrity** - Always shows the latest version of your data
- ✅ **Idempotent uploads** - Same file + same result, every time
- ✅ **Correct fee calculations** - Insertion fees counted once per upload

## Prerequisites
1. Sign up and create an account
2. Go to the **Accounts** page and create at least one eBay account
3. Navigate to the **Orders** page

## CSV Format

### Required Columns
Your CSV file must include these required columns:

| Column Name | Description | Example | Required |
|-------------|-------------|---------|----------|
| `Date` | Order date | 01/15/2024 | Yes |
| `Order #` | Order number from eBay | 123456789 | Yes |
| `SKU` | Product SKU | SKU-001 | Yes |
| `Item` | Product name/title | Sample Product | Yes |
| `Qty` | Quantity ordered | 1 | No (defaults to 1) |
| `Type` | Transaction type | Sale | No (defaults to "Sale") |
| `Gross Amount` | Total sale amount | 49.99 | No (defaults to 0) |
| `Fees` | eBay/PayPal fees | 7.50 | No (defaults to 0) |
| `Sourcing Cost` | Cost to acquire product | 15.00 | No (defaults to 0) |
| `Shipping Cost` | Shipping cost | 5.00 | No (defaults to 0) |
| `Currency` | Currency code | USD | No (defaults to account's default) |

### Alternative Column Names
The system accepts various column name formats (case-insensitive):

- **Date**: `Date`, `Order Date`, `date`
- **Order Number**: `Order #`, `Order Number`, `orderNumber`, `order_number`
- **SKU**: `SKU`, `sku`
- **Item**: `Item`, `Title`, `itemTitle`, `Item Title`
- **Quantity**: `Qty`, `Quantity`, `quantity`
- **Type**: `Type`, `Order Type`
- **Gross**: `Gross Amount`, `Gross`, `gross`
- **Fees**: `Fees`, `Fee`, `fees`
- **Sourcing Cost**: `Sourcing Cost`, `Cost`, `sourcing_cost`
- **Shipping**: `Shipping Cost`, `Shipping`, `shipping`
- **Currency**: `Currency`, `currency`

### Supported Date Formats
- `MM/DD/YYYY` (e.g., 01/15/2024)
- `M/D/YYYY` (e.g., 1/5/2024)
- `YYYY-MM-DD` (e.g., 2024-01-15)
- `DD-MM-YYYY` (e.g., 15-01-2024)

### Supported Currencies
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)

## Sample CSV Template

Download the sample template: `/public/sample-orders-template.csv`

```csv
Date,Order #,SKU,Item,Qty,Type,Gross Amount,Fees,Sourcing Cost,Shipping Cost,Currency
01/15/2024,123456789,SKU-001,Sample Product Name,1,Sale,49.99,7.50,15.00,5.00,USD
01/16/2024,123456790,SKU-002,Another Product,2,Sale,99.98,15.00,30.00,8.50,USD
01/17/2024,123456791,SKU-001,Sample Product Name,1,Sale,49.99,7.50,15.00,EUR
```

## Upload Process

### Step 1: Select Account
Before uploading, **select a specific account** from the "Account" dropdown filter. You cannot upload CSV files while "All Accounts" is selected.

### Step 2: Upload CSV
1. Click the "Upload CSV" button
2. Select your CSV file
3. The system will:
   - Parse the CSV file
   - Validate each row
   - Match SKUs with existing products (if any)
   - Import valid orders
   - Report any errors

### Step 3: Review Results
After upload, you'll receive a notification showing:
- Number of orders successfully imported
- Number of rows with errors (if any)

Check the browser console for detailed error information if any rows failed to import.

## Common Issues

### Issue: "Please select an account first"
**Solution**: Change the account dropdown from "All Accounts" to a specific account.

### Issue: "Please create an account first"
**Solution**: Go to the Accounts page and create at least one eBay account before uploading orders.

### Issue: "Missing Order Number" or "Missing SKU"
**Solution**: Ensure your CSV has these required columns with proper column names. Check that every row has values in these columns.

### Issue: Date parsing errors
**Solution**: Use one of the supported date formats listed above. Ensure dates are valid.

## Product Linking

If you have products in your inventory with matching SKUs, the system will automatically link uploaded orders to those products. This enables:
- Better inventory tracking
- Product performance analytics
- Profit calculations using product-specific costs

To get the most out of order imports:
1. First, add your products to the Inventory page with their SKUs
2. Then upload orders - they'll be automatically linked

## Profit Calculation

The system automatically calculates profit for each order:

```
Profit = Gross Amount - Fees - Sourcing Cost - Shipping Cost
```

Make sure to include accurate values for all cost columns to get correct profit calculations in your analytics.

## Tips for Best Results

1. **Consistent SKUs**: Use the same SKU format in your CSV as in your inventory
2. **Complete Data**: Include all cost columns for accurate profit tracking
3. **Correct Account**: Always select the right eBay account before uploading
4. **Clean Data**: Remove empty rows and ensure proper formatting before upload
5. **Date Format**: Stick to one date format throughout your CSV file
6. **Currency**: Include currency if you sell in multiple currencies, otherwise it will use the account's default

## Application Flow

```
1. Sign Up → Choose Plan (Personal/Pro/Enterprise)
2. Create eBay Account(s) in Accounts page
3. (Optional) Add Products to Inventory page
4. Upload Orders CSV for each account
5. View analytics and manage team members
```

## Support

If you encounter issues not covered in this guide:
1. Check the browser console for detailed error messages
2. Verify your CSV format matches the template
3. Ensure your account and plan are properly configured
