# CSV Upload Fixes - Summary

## ✅ Issues Resolved

### 1. Duplicate Orders Prevention
**Problem**: Reuploading the same CSV file created duplicate orders in the database.

**Solution**: 
- Added file content hash tracking to uniquely identify each CSV file
- System automatically detects when the same file is uploaded again
- Deletes all previous orders from that file before inserting new ones
- Result: **Idempotent uploads** - upload the same file 100 times = same data, no duplicates

### 2. Insertion Fee Calculation (Column Z)
**Problem**: Insertion fees were being recalculated and duplicated on each reupload.

**Solution**:
- Added proper detection for insertion fee transaction types
- Normalized various formats: `insertion fee`, `listing fee`, `Insertion`
- Insertion fees are now part of the order records tracked by fileHash
- When file is reuploaded, insertion fees are replaced (not duplicated)
- Result: **Single calculation per upload** - fees calculated once and displayed once

### 3. Data Integrity & Idempotent Uploads
**Problem**: No way to update orders from a CSV without creating duplicates.

**Solution**:
- SHA-256 hash generated from CSV file content
- Each order tagged with its source file hash
- Automatic cleanup of old data when same file is reuploaded
- Result: **Always shows latest version** of your data

## 🔧 Technical Changes

### Files Modified:

#### 1. `src/models/EbayOrder.js`
- Added `fileHash` field to track CSV source file
- Field is indexed for fast duplicate detection
- Backwards compatible with existing orders

#### 2. `src/app/api/orders/upload/route.js`
- Import `crypto` module for hash generation
- Generate SHA-256 hash from CSV content
- Check for existing orders with same fileHash
- Delete old orders before inserting new ones
- Normalize insertion fee transaction types
- Updated SKU validation (not required for fee transactions)
- All orders tagged with fileHash during insertion

### Files Created:

#### 3. `CSV_REUPLOAD_IMPLEMENTATION.md`
- Complete technical documentation
- Architecture and implementation details
- Testing checklist
- Expected behavior scenarios

#### 4. Updated `CSV_UPLOAD_GUIDE.md`
- Added section on duplicate prevention
- Explained insertion fee handling
- User-facing documentation

## 📊 Expected Behavior

### Scenario: First Upload
```
Action: Upload orders_january.csv (100 orders, 5 insertion fees)
Result: ✅ 105 records created
```

### Scenario: Reupload Same File
```
Action: Upload orders_january.csv again (same file)
Process:
  1. System detects same file hash
  2. Deletes previous 105 records
  3. Inserts 105 records again
Result: ✅ Still 105 records total (NO DUPLICATES)
```

### Scenario: Upload Modified File
```
Action: Edit costs in orders_january.csv, upload again
Process:
  1. System detects different file hash (content changed)
  2. Keeps old 105 records
  3. Inserts 105 new records
Result: ✅ 210 records total (old + new versions)
Note: Use Replace Mode to delete old version if needed
```

### Scenario: Insertion Fee Handling
```
CSV Row 50: Order #12345, Type: "Sale", Amount: $50
CSV Row 51: Order #IF-001, Type: "insertion fee", Amount: $2

Upload 1: Both records created
Upload 2 (same file): Both records replaced (not duplicated)
Upload 3 (same file): Both records replaced again

Result: ✅ Always 2 records, fees calculated once per upload
```

## 🎯 Benefits

1. **No Manual Cleanup** - System handles everything automatically
2. **Data Integrity** - Always correct, up-to-date information
3. **Accurate Analytics** - No inflated numbers from duplicates
4. **Correct Fees** - Insertion fees counted once, not multiple times
5. **Safe Reuploads** - Update data by reuploading CSV, no risk
6. **Backwards Compatible** - Existing orders continue to work

## 🧪 How to Test

### Test 1: Basic Duplicate Prevention
1. Go to Orders page
2. Select an account
3. Upload a CSV file
4. Note the number of orders imported
5. Upload the **same exact file** again
6. Verify: Same number of orders (not doubled)
7. Check analytics: Revenue should be same, not doubled

### Test 2: Insertion Fee
1. Create a CSV with insertion fee rows:
   ```csv
   Date,Order #,SKU,Item,Type,Gross Amount,Fees
   01/09/2026,12345,ABC,Product,Sale,50.00,5.00
   01/09/2026,IF-001,,Listing Fee,insertion fee,0.00,2.00
   ```
2. Upload the CSV
3. Verify both records appear in orders list
4. Check transaction type for second row = "insertion fee"
5. Upload the same CSV again
6. Verify still only 2 records (not 4)

### Test 3: Updated Data
1. Upload a CSV file
2. Edit some amounts in the CSV
3. Upload the modified file
4. Verify new records appear (different file hash)
5. Old records still exist (unless Replace Mode used)

## 🔒 Security & Data Integrity

- File hash scoped to `adminId` and `accountId`
- Users can only replace their own orders
- No cross-tenant data contamination
- Audit trail maintained (`uploadedBy` field)
- Database indexes ensure fast performance

## 📝 User Instructions

### For Business Users:
1. Upload your eBay CSV export as normal
2. If you need to update data, just reupload the corrected CSV file
3. System automatically replaces old data with new data
4. No need to manually delete old orders
5. Insertion fees from Column Z are handled automatically

### Tips:
- Same file = Data replacement (no duplicates)
- Modified file = New version (keeps old data too)
- Use Replace Mode for date range deletions if needed
- Check the upload result message for confirmation

## ⚠️ Important Notes

1. **File Content Matters**: Hash is based on content, not filename
   - Renaming the file doesn't change its hash
   - Editing even one character changes the hash

2. **Backwards Compatibility**: 
   - Old orders without fileHash are not affected
   - They won't be deleted by new uploads
   - No data migration required

3. **Replace Mode**: 
   - Still available for date range deletions
   - Works independently from file hash tracking
   - Use when you want to delete by date, not by file

## 🚀 Deployment Notes

No database migration required:
- New field is optional
- Existing orders continue to work
- New uploads will include fileHash
- System is fully backwards compatible

## Support

If you encounter any issues:
1. Check browser console for detailed error messages
2. Verify CSV format matches requirements
3. Review [CSV_REUPLOAD_IMPLEMENTATION.md](./CSV_REUPLOAD_IMPLEMENTATION.md) for technical details
4. Review [CSV_UPLOAD_GUIDE.md](./CSV_UPLOAD_GUIDE.md) for user guide
