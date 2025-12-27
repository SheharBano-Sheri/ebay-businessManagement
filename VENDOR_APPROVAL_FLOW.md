# Vendor Approval Flow - Complete Implementation

## Overview
This document describes the complete vendor and inventory approval system implemented for public vendors.

## Workflow Summary

### 1. Public Vendor Signup
When a public vendor signs up:
- **User Account**: Created with `isActive: false` and `vendorApprovalStatus: 'pending'`
- **Vendor Record**: Created with `approvalStatus: 'pending'` and `status: 'pending'`
- **Access**: Cannot sign in until approved by Master Admin
- **Message**: "Your account is pending approval by the administrator"

### 2. Master Admin Reviews Vendor
Master Admin can:
- View all pending vendors at `/dashboard/vendor-approvals`
- See vendor details (name, email, registration date)
- **Approve** or **Reject** the vendor
- Set **Auto-Approve Inventory** flag during approval (optional)

### 3. Vendor Approval
When Master Admin approves a vendor:
- **User Account**: `isActive` set to `true`, `vendorApprovalStatus` set to `'approved'`
- **Vendor Record**: `approvalStatus` set to `'approved'`, `status` set to `'active'`, `isActive` set to `true`
- **Auto-Approve Flag**: Optionally set `autoApproveInventory: true` for automatic inventory approval
- **Access Granted**: Vendor can now sign in to the system

### 4. Vendor Adds Inventory
**IMPORTANT**: Only APPROVED vendors can add products

After vendor approval, when they add products:
- **Auto-Approve ON**: Products are automatically approved and visible to all users
  - `isApproved: true`
  - `approvedBy: vendorUserId`
  - `approvedAt: Date.now()`
  
- **Auto-Approve OFF**: Products require manual approval
  - `isApproved: false`
  - Products visible only to Master Admin (in inventory and inventory approvals pages)
  - Products NOT visible to the vendor themselves or regular users until approved

### 5. Inventory Approval (Master Admin Reviews)
Master Admin can:
- View **ALL** pending products at `/dashboard/inventory-approvals`
- See products from **ALL public vendors** (approved vendors only, since unapproved vendors cannot add products)
- Select multiple products to approve/reject
- **Approve**: Products become visible to:
  - The public vendor who added them
  - All regular users who added that public vendor to their account
- **Reject**: Products are soft-deleted (`isActive: false`)

## Product Visibility Rules

### For Master Admin
- Sees **ALL products** (approved and unapproved) from **ALL public vendors**
- Can review and approve inventory from any public vendor
- This applies to both the inventory page and inventory approvals page

### For Public Vendor (viewing own inventory)
- Sees **their own products** regardless of approval status
- Can see which products are pending approval vs approved
- Can add products anytime

### For Regular Users (Business Managers)
- See **ONLY approved products** from **approved public vendors** they have added to their account
- Cannot see:
  - Unapproved products from public vendors
  - Products from pending/rejected public vendors
  - Products from public vendors they haven't added

## Key Points (Public Vendor Specific)

1. **Master Admin approves PUBLIC VENDORS only** (private/virtual vendors don't need approval)
2. **Public vendor signup** → Account pending, cannot sign in until Master Admin approves
3. **Master Admin approves vendor** → Can optionally enable "Auto-Approve Inventory"
4. **Public vendor adds inventory** → Visible ONLY to themselves and Master Admin
5. **If Auto-Approve OFF** → Master Admin must approve each product
6. **If Auto-Approve ON** → Products automatically approved and visible to all users
7. **After approval** → Products visible to all users who added that public vendor

## Vendor Visibility Rules

### For Master Admin
- Sees **all public vendors** (approved, pending, rejected)
- Can manage vendor approvals

### For Regular Users
- See **only approved public vendors** in the marketplace
- Can add approved vendors to their account
- Cannot see pending or rejected vendors

## Database Schema Updates

### User Model
```javascript
{
  vendorApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: function() {
      return this.role === 'public_vendor' ? 'pending' : 'approved';
    }
  }
}
```

### Vendor Model
```javascript
{
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'  // For invited/private vendors
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive'],
    default: 'active'
  },
  autoApproveInventory: {
    type: Boolean,
    default: false
  }
}
```

### Product Model
```javascript
{
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}
```

## API Endpoints

### Vendor Approval
- **GET** `/api/admin/vendor-approvals` - Fetch pending vendors
- **POST** `/api/admin/vendor-approvals` - Approve/reject vendor
  ```json
  {
    "vendorId": "vendor_id",
    "action": "approve" | "reject",
    "autoApproveInventory": true | false
  }
  ```

### Inventory Approval
- **GET** `/api/admin/inventory-approvals` - Fetch pending products (from approved vendors only)
- **POST** `/api/admin/inventory-approvals` - Approve/reject products
  ```json
  {
    "productIds": ["product_id1", "product_id2"],
    "action": "approve" | "reject"
  }
  ```

### Products
- **GET** `/api/products` - Fetch products (filtered by visibility rules)
- **POST** `/api/products` - Add product (auto-approval logic applied)

### Vendors
- **GET** `/api/vendors` - Fetch vendors (approved only for regular users)
- **POST** `/api/vendors` - Add vendor or link existing public vendor

## Sign In Flow

1. User enters credentials
2. System validates password
3. **If public vendor**:
   - Check `user.isActive` → must be `true`
   - Check `user.vendorApprovalStatus` → must be `'approved'`
   - Check vendor record `approvalStatus` → must be `'approved'`
4. If any check fails: Show appropriate error message
5. If all checks pass: Create session and allow login

## Dashboard Pages

### For Master Admin
- `/dashboard/vendor-approvals` - Review and approve/reject vendor registrations
- `/dashboard/inventory-approvals` - Review and approve/reject inventory from approved vendors

### For Public Vendors
- `/dashboard/inventory` - View and manage their own products
- Products show approval status badge

### For Regular Users
- `/dashboard/vendors` - Browse and add approved public vendors
- `/dashboard/inventory` - View approved products from vendors they added

## Key Implementation Files

### Models
- [src/models/User.js](src/models/User.js) - User model with vendorApprovalStatus
- [src/models/Vendor.js](src/models/Vendor.js) - Vendor model with approval fields
- [src/models/Product.js](src/models/Product.js) - Product model with approval fields

### Authentication
- [src/app/api/auth/signup/route.js](src/app/api/auth/signup/route.js) - Signup logic for public vendors
- [src/app/api/auth/[...nextauth]/route.js](src/app/api/auth/[...nextauth]/route.js) - Sign-in validation

### API Routes
- [src/app/api/admin/vendor-approvals/route.js](src/app/api/admin/vendor-approvals/route.js)
- [src/app/api/admin/inventory-approvals/route.js](src/app/api/admin/inventory-approvals/route.js)
- [src/app/api/products/route.js](src/app/api/products/route.js)
- [src/app/api/vendors/route.js](src/app/api/vendors/route.js)

### UI Pages
- [src/app/dashboard/vendor-approvals/page.jsx](src/app/dashboard/vendor-approvals/page.jsx)
- [src/app/dashboard/inventory-approvals/page.jsx](src/app/dashboard/inventory-approvals/page.jsx)

## Security Considerations

1. **Role-Based Access**: Only Master Admin can approve vendors and inventory
2. **Data Isolation**: Users only see approved content unless they're Master Admin
3. **Double Validation**: Both User and Vendor records validated during sign-in
4. **Audit Trail**: Login history tracks failed attempts with reasons
5. **Soft Deletes**: Rejected products are soft-deleted, not permanently removed

## Testing Checklist

- [ ] Public vendor signup creates pending account
- [ ] Pending vendor cannot sign in
- [ ] Master Admin sees pending vendors
- [ ] Master Admin can approve vendor (with/without auto-approve)
- [ ] Approved vendor can sign in
- [ ] Approved vendor can add products
- [ ] Products follow auto-approve setting
- [ ] Master Admin sees pending products from approved vendors only
- [ ] Master Admin can approve/reject inventory
- [ ] Regular users only see approved products from approved vendors
- [ ] Regular users only see approved vendors in marketplace
- [ ] Rejected vendor cannot sign in
- [ ] Product visibility follows all rules correctly
