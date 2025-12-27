# Inventory Approval System for Public Vendors

## Overview
Implemented a comprehensive inventory approval workflow for public vendors, ensuring master admins have full control over which products are publicly visible to all users.

## Features Implemented

### 1. Product Approval Fields
**Model: `Product.js`**
- `isApproved` (Boolean, default: false) - Whether the product is approved for public visibility
- `approvedBy` (User reference) - Admin who approved the product
- `approvedAt` (Date) - Timestamp of approval

### 2. Vendor Auto-Approval Setting
**Model: `Vendor.js`**
- `autoApproveInventory` (Boolean, default: false) - Toggle for automatic approval of new products

### 3. Visibility Rules

#### Master Admin
- Sees ALL products (approved and pending)
- Can approve/reject inventory items
- Can toggle auto-approval per vendor

#### Public Vendor
- Sees only THEIR OWN products (approved or not)
- Products pending approval shown with "Pending" badge
- Can add inventory (subject to approval)

#### Regular Users
- See only APPROVED products
- No access to pending inventory

### 4. Product Creation Logic

When a public vendor adds inventory:
```javascript
if (role === 'master_admin' ||  vendor?.autoApproveInventory || vendor?.vendorType !== 'public') {
  isApproved = true  // Auto-approve
} else {
  isApproved = false  // Requires manual approval
}
```

**Auto-Approval Conditions:**
1. User is master admin
2. Vendor has auto-approval enabled
3. Vendor is NOT a public vendor (private/virtual vendors auto-approve)

### 5. API Endpoints

#### GET `/api/products?vendorId={id}`
- Returns products filtered by vendor
- Applies visibility rules based on user role
- Master admin: all products
- Public vendor: own products only
- Regular users: approved products only

#### GET `/api/admin/inventory-approvals`
- Master admin only
- Returns all pending inventory items
- Filterable by vendorId

#### POST `/api/admin/inventory-approvals`
- Master admin only
- Approve or reject products in bulk
- **Body:**
  ```json
  {
    "productIds": ["id1", "id2"],
    "action": "approve" | "reject"
  }
  ```

#### PATCH `/api/admin/inventory-approvals`
- Master admin only
- Toggle auto-approval for a vendor
- **Body:**
  ```json
  {
    "vendorId": "vendor_id",
    "autoApproveInventory": true | false
  }
  ```

### 6. User Interface

#### Vendors Page (`/dashboard/vendors`)

**View Products Feature:**
- Click "View Products" on any vendor card
- Opens dialog showing all vendor's products
- Displays approval status badges:
  - ✅ "Approved" (green)
  - ⏳ "Pending Approval" (orange)

**Auto-Approve Toggle** (Public Vendors Only):
- Shows toggle button in products dialog
- ON/OFF switch for automatic approval
- Only visible to master admin
- Persists per vendor

#### Inventory Page (`/dashboard/inventory`)
- Products from public vendors show pending badge if not approved
- Master admin sees all products with status
- Regular users see only approved products
- Public vendors see their own products with status

#### Inventory Approvals Page (`/dashboard/inventory-approvals`)
**Master Admin Only**

Features:
- **Pending Count Card**: Shows total items awaiting approval
- **Bulk Selection**: Select all or individual products
- **Product Cards Display**:
  - Product name, SKU, description
  - Stock level and unit cost
  - Vendor name and type
  - Who added it and when
  - "Pending" status badge
- **Action Buttons**:
  - "Approve (X)" - Approve selected items
  - "Reject (X)" - Reject selected items
- **Select All/Deselect All**: Quick selection toggle

#### Sidebar Navigation
Master admins see new menu item:
- 📋 **Inventory Approvals** - Direct link to pending items page

### 7. Workflow Examples

#### Scenario 1: Public Vendor Adds Inventory
1. Public vendor navigates to Inventory page
2. Clicks "Add Product" and fills form
3. Submits product
4. Product created with `isApproved: false`
5. Product visible to:
   - Master admin (in all product lists)
   - The vendor themselves (with "Pending" badge)
6. Product NOT visible to regular users

#### Scenario 2: Master Admin Approves Inventory
1. Master admin navigates to "Inventory Approvals"
2. Sees list of pending products with details
3. Selects products to approve
4. Clicks "Approve (X)" button
5. Products updated with:
   ```javascript
   isApproved: true
   approvedBy: admin_user_id
   approvedAt: current_timestamp
   ```
6. Products now visible to ALL users

#### Scenario 3: Auto-Approval Enabled
1. Master admin opens vendor products dialog
2. Toggles "Auto-Approve Inventory" to ON
3. Public vendor adds new inventory
4. Product automatically approved:
   ```javascript
   isApproved: true
   approvedBy: vendor_user_id
   approvedAt: current_timestamp
   ```
5. Product immediately visible to all users

#### Scenario 4: Rejecting Inventory
1. Master admin selects unwanted products
2. Clicks "Reject (X)" button
3. Products marked as `isActive: false`
4. Products removed from all lists
5. Vendor can no longer see them

### 8. Database Schema Changes

#### Product Model
```javascript
{
  // ...existing fields
  isApproved: Boolean (default: false),
  approvedBy: ObjectId (ref: 'User'),
  approvedAt: Date
}
```

#### Vendor Model
```javascript
{
  // ...existing fields
  autoApproveInventory: Boolean (default: false)
}
```

### 9. Security & Permissions

**Authorization Checks:**
- Inventory approval APIs: Master admin only
- Auto-approve toggle: Master admin only
- View all products: Master admin
- View own products: Public vendors
- View approved only: Regular users

**API Protection:**
```javascript
if (!session || session.user.role !== 'master_admin') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 10. UI Components

**Badges:**
- `<Badge variant="warning">Pending Approval</Badge>` - Orange, for unapproved items
- `<Badge variant="success">Approved</Badge>` - Green, for approved items
- `<Badge variant="outline">Public</Badge>` - For vendor type

**Dialogs:**
- **View Products**: Shows vendor's products with approval status
- **Auto-Approve Toggle**: Switch control with explanation text

**Cards:**
- Pending count summary card
- Individual product cards with checkboxes
- Vendor information sections

### 11. Testing Instructions

#### Test 1: Add Product as Public Vendor
1. Login as public vendor
2. Add new product in Inventory
3. Check product shows "Pending" badge
4. Verify product NOT visible to regular users
5. Verify product visible to master admin

#### Test 2: Approve Product
1. Login as master admin
2. Navigate to "Inventory Approvals"
3. See pending product in list
4. Select and click "Approve"
5. Verify product now visible to all users
6. Check approved timestamp and approver

#### Test 3: Auto-Approval
1. Login as master admin
2. Go to Vendors page
3. Click "View Products" on public vendor
4. Toggle "Auto-Approve" to ON
5. Login as that public vendor
6. Add new product
7. Verify product immediately approved
8. Check product visible to all users

#### Test 4: Reject Product
1. Login as master admin
2. Go to "Inventory Approvals"
3. Select unwanted products
4. Click "Reject"
5. Verify products no longer appear in any list

#### Test 5: View Products by Vendor
1. Go to Vendors page
2. Click "View Products" on any vendor
3. Verify products listed correctly
4. Check approval status badges display properly
5. Verify auto-approve toggle works (master admin only)

### 12. Files Modified/Created

**Created:**
- `src/app/api/admin/inventory-approvals/route.js` - Approval API
- `src/app/dashboard/inventory-approvals/page.jsx` - Approval page UI

**Modified:**
- `src/models/Product.js` - Added approval fields
- `src/models/Vendor.js` - Added autoApproveInventory
- `src/app/api/products/route.js` - Added visibility filtering and approval logic
- `src/app/dashboard/vendors/page.jsx` - Added view products dialog and auto-approve toggle
- `src/app/dashboard/inventory/page.jsx` - Added pending badge display
- `src/components/app-sidebar.jsx` - Added Inventory Approvals link for master admin

### 13. Benefits

✅ **Quality Control**: Master admin reviews all public vendor inventory
✅ **Flexible Workflow**: Can enable auto-approval for trusted vendors
✅ **Transparency**: Clear approval status for all stakeholders
✅ **Bulk Operations**: Approve/reject multiple items at once
✅ **Audit Trail**: Track who approved what and when
✅ **User Experience**: Clean separation between pending and approved inventory
✅ **Scalability**: Easy to manage as vendor count grows

### 14. Future Enhancements (Optional)

- Email notifications when products are approved/rejected
- Approval history log per product
- Rejection reasons/notes
- Approval delegation to specific team members
- Approval workflows with multiple levels
- Auto-rejection after X days
- Vendor dashboard showing approval statistics
