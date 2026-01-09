# CSV Upload Duplicate Prevention System

## Overview
The CSV bulk upload system now includes comprehensive duplicate prevention mechanisms to ensure that re-uploading product files updates existing products instead of creating duplicates.

## How It Works

### Unique Identifier
Products are uniquely identified by the combination of:
- **SKU** (Stock Keeping Unit) - The product's unique identifier
- **Admin ID** - The account owner's ID

This means:
- ✅ Two different admins can have the same SKU (different products)
- ❌ The same admin cannot have duplicate SKUs (prevented at database level)

### Upload Process

When a CSV file is uploaded:

1. **Parse CSV File** - Read and validate each row
2. **Vendor Matching** - Match vendor names/IDs to existing vendors
3. **Duplicate Check** - For each product:
   - Query database for existing product with matching SKU + Admin ID
   - If found → **UPDATE** the existing product
   - If not found → **CREATE** a new product
4. **Return Summary** - Show counts of created, updated, and failed products

## Database Protection

### Compound Unique Index
```javascript
ProductSchema.index({ adminId: 1, sku: 1 }, { unique: true });
```

This ensures:
- Database-level enforcement of uniqueness
- Prevents accidental duplicates even if application logic fails
- Fast lookup performance for duplicate checking

## Upload Results

### Success Message Format
```
Upload complete! X created, Y updated, Z failed
```

### Detailed Response
```json
{
  "message": "Import completed: 50 successful (30 created, 20 updated), 5 failed",
  "results": {
    "success": 50,
    "failed": 5,
    "created": 30,
    "updated": 20,
    "errors": [],
    "summary": {
      "total": 55,
      "created": 30,
      "updated": 20,
      "successful": 50,
      "failed": 5
    }
  }
}
```

## Update vs Create Logic

### When Products Are UPDATED
Existing products are updated when:
- SKU matches an existing product for the same admin
- All fields are refreshed with new CSV data
- Stock quantities are replaced (not added)
- `updatedAt` timestamp is refreshed

### When Products Are CREATED
New products are created when:
- SKU doesn't exist in the database for this admin
- Approval status is determined based on vendor type:
  - **Private/Virtual vendors**: Auto-approved
  - **Public vendors with auto-approve**: Auto-approved
  - **Public vendors without auto-approve**: Pending approval

## CSV File Format

```csv
Country,SKU,Name,Description,Type,Vendor,Stock,Unit Cost,Listing URL
USA,SKU-001,Product Name,Description,Electronics,Vendor Name,100,25.99,https://...
```

### Important Notes
- **SKU column is critical** - This is the unique identifier
- SKUs are trimmed of whitespace for consistency
- Vendor matching is case-insensitive
- Empty fields in updates will use existing values (except stock/cost which are set to 0)

## Best Practices

### For Master Admins
1. **Export before bulk changes** - Download current inventory as backup
2. **Review vendor names** - Ensure vendor names match exactly
3. **Test with small files** - Try 10-20 products first
4. **Check update summary** - Verify created vs updated counts make sense

### For Public Vendors
1. **Maintain consistent SKUs** - Don't change SKUs between uploads
2. **Regular updates** - Upload updated inventory periodically
3. **Monitor approval status** - Check which products need approval
4. **Coordinate with admins** - Inform them of large inventory changes

## Error Handling

### Common Errors Prevented
- ❌ Duplicate SKUs for the same admin
- ❌ Products without SKUs or names
- ❌ Invalid vendor references
- ❌ Malformed CSV files

### Error Messages Include
- Row number where error occurred
- Specific reason for failure
- Available vendors if vendor not found
- Field validation details

## Examples

### Example 1: Initial Upload
```
CSV contains: 100 products
Result: 100 created, 0 updated, 0 failed
```

### Example 2: Re-upload Same File
```
CSV contains: 100 products (same SKUs)
Result: 0 created, 100 updated, 0 failed
```

### Example 3: Mixed Upload
```
CSV contains: 120 products
- 100 existing SKUs (updated)
- 20 new SKUs (created)
Result: 20 created, 100 updated, 0 failed
```

### Example 4: Upload with Errors
```
CSV contains: 50 products
- 40 valid products (30 new, 10 existing)
- 10 invalid (missing vendors)
Result: 30 created, 10 updated, 10 failed
```

## Technical Implementation

### API Endpoint
```
POST /api/products/upload
Content-Type: multipart/form-data
```

### Database Query
```javascript
const existingProduct = await Product.findOne({ 
  adminId: adminId, 
  sku: sku.trim() 
});
```

### Update Operation
```javascript
if (existingProduct) {
  existingProduct.name = name;
  existingProduct.stock = parseInt(stock) || 0;
  existingProduct.unitCost = parseFloat(unitCost) || 0;
  existingProduct.updatedAt = new Date();
  await existingProduct.save();
  results.updated++;
}
```

### Create Operation
```javascript
if (!existingProduct) {
  await Product.create({
    sku: sku.trim(),
    name,
    adminId,
    vendorId,
    stock: parseInt(stock) || 0,
    unitCost: parseFloat(unitCost) || 0,
    // ... other fields
  });
  results.created++;
}
```

## Logging

### Console Logs Include
- Upload start/end timestamps
- User and admin ID information
- Row-by-row processing status
- Update vs create decisions
- Error details with row numbers

### Example Log Output
```
=== CSV Upload Started ===
User: vendor@example.com AdminId: 507f1f77bcf86cd799439011
File received: inventory.csv 15234 bytes
Row 2: Updating existing product with SKU: SKU-001
Row 3: Creating new product with SKU: SKU-100
Upload results: { success: 50, created: 30, updated: 20, failed: 0 }
```

## Security Considerations

- ✅ Session validation required
- ✅ Admin ID from authenticated session
- ✅ Vendor ownership validation
- ✅ Permission-based access control
- ✅ SQL injection prevention (Mongoose ODM)
- ✅ File type validation (CSV only)

## Performance

### Optimization Features
- Database index on `{ adminId, sku }`
- Efficient vendor lookup using Map
- Single database query per product check
- Batch processing of CSV rows

### Recommended Limits
- Maximum 1000 products per upload (recommended)
- File size limit: 5MB
- Process time: ~2-5 seconds per 100 products

## Troubleshooting

### "Vendor not found" Error
**Cause**: Vendor name in CSV doesn't match any vendor in system
**Solution**: Check vendor spelling, case-sensitivity doesn't matter but spelling must be exact

### "Duplicate key error"
**Cause**: Race condition or concurrent uploads
**Solution**: System now handles this gracefully by updating instead

### All Products Showing as "Created"
**Cause**: SKUs in CSV don't match existing SKUs (possibly different format)
**Solution**: Ensure SKU format is consistent between uploads

### All Products Showing as "Updated" When Expected New
**Cause**: SKUs match existing products
**Solution**: Verify you intended to update existing products, or use new SKUs

---

## Migration Notes

### Existing Deployments
No database migration required. The unique index will be created automatically on next deployment.

### Data Integrity
All existing products will remain unchanged. The duplicate prevention only affects new uploads.

---

*Last Updated: January 9, 2026*
