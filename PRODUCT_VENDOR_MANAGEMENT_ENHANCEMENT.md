# Product & Vendor Management Enhancement

## Overview
This document outlines the enhancements made to the product inventory management and vendor management systems to provide better control and moderation capabilities.

## Implemented Features

### 1. Bulk Product Removal in Inventory ✅

**Location:** `src/app/dashboard/inventory/page.jsx`

**Changes:**
- Added bulk delete functionality for selected products
- Added a "Delete Selected" button that appears when products are selected
- Shows count of selected products in the button
- Confirmation dialog before bulk deletion
- Permission-based access (requires 'inventory' edit permission)

**API Endpoint:** `src/app/api/products/bulk-delete/route.js`
- POST endpoint for bulk deletion
- Validates user permissions
- Only deletes products belonging to the user's admin account
- Returns count of deleted products

**Usage:**
1. Select products using checkboxes in the inventory table
2. Click "Delete Selected (X)" button
3. Confirm deletion in the dialog
4. Selected products are removed from inventory

---

### 2. Vendor Removal for Business Users ✅

**Location:** `src/app/dashboard/vendors/page.jsx`

**Changes:**
- Added remove button (trash icon) in "My Vendors" tab
- Shows on all vendor cards in the "My Vendors" section
- Allows business users to remove public vendors from their added list
- Allows deletion of private/virtual vendors they own
- Confirmation dialog before removal

**API Endpoint:** `src/app/api/vendors/[id]/route.js`
- DELETE method for vendor removal
- For public vendors: Removes user from the vendor's `addedByUsers` array
- For private/virtual vendors: Deletes the vendor if user is the owner
- Master admins are guided to use hide/unhide instead of deletion for public vendors

**Usage:**
1. Navigate to Vendors > My Vendors tab
2. Find the vendor you want to remove
3. Click the trash icon button
4. Confirm removal in the dialog

---

### 3. Hide/Unhide Public Vendors (Master Admin) ✅

**Database Changes:**
**Location:** `src/models/Vendor.js`

Added new fields to the Vendor schema:
```javascript
{
  isHidden: Boolean,        // Whether vendor is hidden from users
  hiddenBy: ObjectId,       // Master admin who hid the vendor
  hiddenAt: Date           // Timestamp when vendor was hidden
}
```

**API Changes:**
**Location:** `src/app/api/vendors/[id]/route.js`

- PATCH method for hide/unhide operations
- Only accessible to master admins
- Actions: 'hide' or 'unhide'
- Updates vendor visibility without deletion

**Location:** `src/app/api/vendors/route.js`

Updated vendor queries to filter hidden vendors:
- Regular users: Cannot see hidden public vendors
- Master admins: Can see all vendors including hidden ones

**UI Changes:**

**Vendors Page** (`src/app/dashboard/vendors/page.jsx`):
- Added hide/unhide button in Marketplace tab (master admin only)
- Shows "Hidden" badge on hidden vendors
- Disabled "Add to My Vendors" button for hidden vendors

**Vendor Approvals Page** (`src/app/dashboard/vendor-approvals/page.jsx`):
- Added new "Approved Vendors" tab
- Shows list of all approved public vendors
- Hide/Unhide button for each vendor
- Visual indicator (red background) for hidden vendors
- Shows follower count for each vendor

**Usage:**

*From Vendors Page:*
1. Navigate to Vendors > Marketplace tab
2. Find the vendor (master admin will see hide/unhide button)
3. Click "Hide Vendor" to hide or "Unhide Vendor" to unhide
4. Confirm action in the dialog

*From Vendor Approvals Page:*
1. Navigate to Vendor Approvals
2. Click on "Approved Vendors" tab
3. Find the vendor you want to hide/unhide
4. Click the appropriate button
5. Confirm action in the dialog

---

## Security & Permissions

### Product Deletion:
- Requires 'inventory' edit permission
- Users can only delete products belonging to their admin account
- Bulk operations are atomic (all or nothing)

### Vendor Removal:
- Business users can only remove vendors from their own added list
- Private/virtual vendor deletion requires ownership
- Public vendor deletion for master admins is restricted (must use hide)

### Hide/Unhide:
- Exclusive to master admins
- Only works on public vendors
- Tracks who performed the action and when
- Non-destructive (can be reversed)

---

## Database Impact

### New Fields Added:
- `Vendor.isHidden` (Boolean, default: false)
- `Vendor.hiddenBy` (ObjectId reference to User)
- `Vendor.hiddenAt` (Date)

### Indexes:
No new indexes required, but consider adding:
```javascript
VendorSchema.index({ isHidden: 1, vendorType: 1 });
```

---

## User Experience

### Visual Feedback:
- Selected product count shown in UI
- Confirmation dialogs for destructive actions
- Success/error toast notifications
- Visual badges for hidden vendors
- Loading states during operations

### Responsive Design:
- All new buttons are mobile-friendly
- Tables remain scrollable on small screens
- Icons scale appropriately

---

## Testing Recommendations

1. **Product Bulk Deletion:**
   - Test with no products selected
   - Test with single product
   - Test with multiple products
   - Verify permissions for different user roles

2. **Vendor Removal:**
   - Test removing public vendor from added list
   - Test deleting private/virtual vendor
   - Test as different user roles
   - Verify products remain intact after vendor removal

3. **Hide/Unhide:**
   - Test hiding vendor (verify users can't see it)
   - Test unhiding vendor (verify users can see it again)
   - Test as non-master admin (should not see buttons)
   - Verify products from hidden vendors are still accessible
   - Check that users who already added the vendor can still see their products

---

## Future Enhancements

1. **Product Deletion:**
   - Add soft delete option
   - Bulk edit capabilities
   - Export selected products

2. **Vendor Management:**
   - Vendor suspension (temporary hide)
   - Hide reason field with comment
   - Email notification to vendor when hidden
   - Analytics on hidden vendor patterns

3. **Audit Trail:**
   - Log all hide/unhide actions
   - Track bulk delete operations
   - Generate reports on vendor management

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/api/products/bulk-delete` | POST | Delete multiple products | Edit permission |
| `/api/vendors/[id]` | DELETE | Remove vendor from account | Owner/User |
| `/api/vendors/[id]` | PATCH | Hide/unhide vendor | Master Admin |

---

## Files Modified

1. `src/app/dashboard/inventory/page.jsx` - Added bulk delete UI
2. `src/app/dashboard/vendors/page.jsx` - Added remove and hide/unhide buttons
3. `src/app/dashboard/vendor-approvals/page.jsx` - Added approved vendors tab
4. `src/models/Vendor.js` - Added isHidden, hiddenBy, hiddenAt fields
5. `src/app/api/products/bulk-delete/route.js` - New bulk delete endpoint
6. `src/app/api/vendors/[id]/route.js` - New vendor deletion and hide/unhide endpoint
7. `src/app/api/vendors/route.js` - Updated queries to filter hidden vendors

---

## Deployment Notes

1. **Database Migration:**
   - No migration script needed (new fields have defaults)
   - Existing vendors will have `isHidden: false` by default

2. **Environment:**
   - No new environment variables required
   - Works with existing authentication system

3. **Rollback:**
   - If needed, remove new fields from Vendor model
   - Revert API endpoints to previous versions
   - UI changes are backward compatible

---

## Support & Maintenance

For issues or questions:
1. Check user permissions and role
2. Verify database connectivity
3. Check API logs for error details
4. Ensure master admin role is properly assigned

---

*Last Updated: January 9, 2026*
