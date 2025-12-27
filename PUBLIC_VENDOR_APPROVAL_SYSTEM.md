# Public Vendor Approval System - Complete Workflow

## Overview
This system manages the complete lifecycle of public vendors from signup through inventory approval, ensuring that:
- Public vendors must be approved by a master admin before they can access the system
- Products from public vendors are only visible to approved users
- Master admin has control over automatic inventory approval

## Key Entities

### 1. Master Admin
- Only one master admin per system
- Can approve/reject public vendors
- Can set auto-approval flags for vendor inventory
- Sees all products from all vendors (approved and unapproved)
- Approves inventory items before they become public

### 2. Public Vendor
- Registers and creates a vendor account
- Account starts in "pending" status
- Cannot sign in until master admin approves
- Once approved, can add inventory products
- Products they add are only visible to them and master admin until approved

### 3. Regular Users
- Can add public vendors to their account (marketplace feature)
- Can only see approved products from approved vendors
- Cannot see inventory until master admin approves it

## Complete Workflow

### Phase 1: Public Vendor Registration

```
Public Vendor Signs Up
       ↓
Account Created (Pending Status)
       ↓
Gets "Pending Approval" Message
       ↓
Cannot Sign In Until Approved
```

**Flow Details:**
1. User signs up as "Public Vendor" at `/auth/signup`
2. API creates:
   - User record with `role: 'public_vendor'`
   - Vendor record with `approvalStatus: 'pending'`, `vendorType: 'public'`
3. User directed to sign in page with "pending approval" message
4. When attempting to sign in, NextAuth checks vendor approval status
5. If `approvalStatus !== 'approved'`, sign in fails with appropriate message

### Phase 2: Master Admin Approves Vendor

```
Master Admin Views /dashboard/vendor-approvals
       ↓
Sees List of Pending Vendors
       ↓
Selects Vendors & Toggles "Auto-Approve Inventory"
       ↓
Clicks "Approve Vendor"
       ↓
Vendor Status Changed to "approved"
       ↓
Public Vendor Can Now Sign In
```

**Flow Details:**
1. Master admin navigates to `/dashboard/vendor-approvals`
2. Fetches pending vendors from `/api/admin/vendor-approvals` (GET)
3. For each vendor to approve:
   - Toggle "Auto-Approve Inventory" checkbox
   - Click "Approve"
4. POST to `/api/admin/vendor-approvals`:
   ```json
   {
     "vendorId": "...",
     "action": "approve",
     "autoApproveInventory": true/false
   }
   ```
5. Updates vendor:
   - `approvalStatus: 'approved'`
   - `autoApproveInventory: true/false` (if specified)
6. Public vendor can now sign in and access system

### Phase 3: Public Vendor Adds Products

```
Public Vendor Signs In & Adds Product
       ↓
Product Created with isApproved: false
       ↓
Visible ONLY to:
  - The Vendor (themselves)
  - Master Admin
       ↓
NOT Visible to:
  - Regular Users
  - Other Vendors
```

**Product Creation Logic:**
- POST to `/api/products`
- Creates product with:
  - `isApproved: false` (default)
  - `vendorId: selectedVendor._id`
  - `addedBy: currentUser._id`

**Auto-Approve Decision:**
```javascript
if (session.user.role === 'master_admin') {
  isApproved = true;  // Master admin products auto-approve
} else if (vendor.autoApproveInventory === true && vendor.approvalStatus === 'approved') {
  isApproved = true;  // Auto-approve if enabled
} else {
  isApproved = false; // Requires manual approval
}
```

### Phase 4: Master Admin Approves Inventory

```
Master Admin Views /dashboard/inventory-approvals
       ↓
Sees Pending Products from Public Vendors
       ↓
Selects Products & Clicks "Approve"
       ↓
Product isApproved Set to true
       ↓
Products Now Visible to All Users (who added that vendor)
```

**Approval API:**
- GET `/api/admin/inventory-approvals` - Fetch pending products
- POST `/api/admin/inventory-approvals` - Bulk approve/reject

**Visibility Rules After Approval:**

| User Type | Can See Approved Product? |
|-----------|---------------------------|
| Master Admin | ✅ Always (approved or unapproved) |
| Public Vendor (owner) | ✅ Yes (if they added that vendor) |
| Regular User | ✅ Yes (only if BOTH product is approved AND they added that vendor) |
| Other Vendors | ❌ No |

## API Endpoints Reference

### Vendor Approvals
```
GET  /api/admin/vendor-approvals
POST /api/admin/vendor-approvals (approve/reject vendor with auto-approve flag)
```

### Inventory Approvals
```
GET  /api/admin/inventory-approvals (fetch pending products)
POST /api/admin/inventory-approvals (bulk approve/reject products)
```

### Products
```
GET  /api/products (with visibility filtering)
POST /api/products (create new product with auto-approval logic)
```

## Database Schema Updates

### Vendor Model
- `approvalStatus`: enum['pending', 'approved', 'rejected'] - Vendor account approval status
- `autoApproveInventory`: boolean - Auto-approve products from this vendor
- `publicVendorUserId`: ObjectId - Link to the public vendor user

### Product Model
- `isApproved`: boolean - Whether product is visible to end users
- `approvedBy`: ObjectId - Which user approved it
- `approvedAt`: Date - When it was approved

## User Permissions

### Master Admin Sidebar Access
- All main navigation items visible
- Special access to:
  - `/dashboard/vendor-approvals` - Approve public vendors
  - `/dashboard/inventory-approvals` - Approve product inventory

### Public Vendor Sidebar Access
- Once approved:
  - Dashboard
  - Inventory (add products)
  - Vendors (marketplace)
  - Orders
  - Payments
  - Accounts
  - NOT Team Management

### Regular User Sidebar Access
- Dashboard
- Inventory
- Vendors (marketplace)
- Orders
- Payments
- Accounts
- Settings
- Team Management

## Testing Checklist

- [ ] Public vendor signs up → shown "Pending Approval" message
- [ ] Public vendor tries to sign in → fails with "pending approval" message
- [ ] Master admin sees vendor in approvals page
- [ ] Master admin can toggle "Auto-Approve Inventory"
- [ ] Master admin approves vendor
- [ ] Public vendor can now sign in
- [ ] Public vendor adds product → product created, not visible in their inventory (not approved)
- [ ] Master admin can see pending product in inventory approvals
- [ ] Master admin approves product
- [ ] Product appears in public vendor's inventory
- [ ] Product appears in regular user's inventory (if they added that vendor)
- [ ] With auto-approve ON: new products auto-approve immediately
- [ ] Regular users cannot see unapproved products

## Error Handling

### Signup
- "Your vendor account is pending approval by the administrator"
- "Your vendor account application has been rejected"

### Sign In
- "Your vendor account is pending approval by the administrator"
- "Your vendor account application has been rejected"

### Product Creation
- "Vendor not found" (if vendor ID invalid)
- "Missing required fields"
- "Admin ID not found in session"

## Notes

- Auto-approval is set DURING vendor approval, not separately
- Public vendors see their own products immediately (to track what they added)
- Only master admin sees unapproved inventory
- Regular users see products only after both: vendor is approved + product is approved
- If auto-approve is enabled for a vendor, new products auto-approve on creation
- System supports multiple vendors per user (one virtual + multiple public vendors)
