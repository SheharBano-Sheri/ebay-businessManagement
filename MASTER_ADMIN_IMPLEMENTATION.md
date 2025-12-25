# Master Admin & Vendor Approval System - Implementation Guide

## Overview
This document outlines the implementation of the Master Admin account and the vendor approval system for GenieBMS.

## What Was Implemented

### 1. CSV Upload on Inventory Page ✅
The CSV upload functionality was already implemented and is fully functional. The feature allows you to:
- Upload product data via CSV files
- Download current inventory as CSV
- Download a template CSV file

**Location:** [Inventory Page](src/app/dashboard/inventory/page.jsx)
**API Endpoint:** `/api/products/upload`

### 2. Master Admin Account ✅

#### Credentials:
- **Email:** `masteradmin@geniebms.local`
- **Username:** `MasterAdmin`
- **Password:** `admin890`

#### Features:
- Same dashboard view as other users
- Additional "Vendor Approvals" page to manage public vendor signup requests
- Special role: `master_admin`
- Enterprise membership plan with 100-year validity

#### How to Create Master Admin:
1. Visit: `http://localhost:3000/setup/master-admin`
2. Click "Create Master Admin" button
3. Sign in with the credentials above

**API Endpoint:** `/api/admin/seed-master` (POST)

### 3. Vendor Approval System ✅

#### For Public Vendors:
When a public vendor signs up:
1. Account is created but in **pending** state
2. Vendor record has `approvalStatus: 'pending'`
3. User cannot sign in until approved
4. They receive a message: "Registration successful! Your account is pending approval by the administrator."

#### For Master Admin:
1. Sign in with Master Admin credentials
2. Navigate to **"Vendor Approvals"** in the sidebar
3. View all pending vendor requests
4. Approve or Reject each vendor

**Vendor Approvals Page:** `/dashboard/vendor-approvals`

#### When Vendor is Approved:
- `approvalStatus` changes to `'approved'`
- `status` changes to `'active'`
- `isActive` becomes `true`
- Vendor can now sign in to their account

#### When Vendor is Rejected:
- `approvalStatus` changes to `'rejected'`
- `status` changes to `'inactive'`
- `isActive` becomes `false`
- Vendor cannot sign in

## Files Modified

### Models
1. **[User.js](src/models/User.js)**
   - Added `master_admin` to role enum

2. **[Vendor.js](src/models/Vendor.js)**
   - Added `approvalStatus` field with values: `pending`, `approved`, `rejected`

### API Routes
1. **[signup/route.js](src/app/api/auth/signup/route.js)**
   - Modified to create public vendors with `pending` approval status
   - Returns special message for pending approval

2. **[auth/[...nextauth]/route.js](src/app/api/auth/[...nextauth]/route.js)**
   - Added check to prevent unapproved vendors from signing in
   - Shows appropriate error messages

3. **New API Routes Created:**
   - `/api/admin/seed-master` - Creates Master Admin account
   - `/api/admin/pending-vendors` - Get list of pending vendors (Master Admin only)
   - `/api/admin/approve-vendor` - Approve or reject vendors (Master Admin only)

### Pages
1. **[vendor-approvals/page.jsx](src/app/dashboard/vendor-approvals/page.jsx)**
   - New page for Master Admin to review vendor requests
   - Shows pending vendors in a table
   - Approve/Reject buttons for each vendor

2. **[setup/master-admin/page.jsx](src/app/setup/master-admin/page.jsx)**
   - Setup page to create Master Admin account
   - Shows credentials after creation

### Components
1. **[app-sidebar.jsx](src/components/app-sidebar.jsx)**
   - Added conditional "Vendor Approvals" menu item for Master Admin

## How to Use

### Initial Setup
1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Create Master Admin:**
   - Visit: `http://localhost:3000/setup/master-admin`
   - Click "Create Master Admin"
   - Note the credentials displayed

3. **Sign in as Master Admin:**
   - Visit: `http://localhost:3000/auth/signin`
   - Email: `masteradmin@geniebms.local`
   - Password: `admin890`

### Testing the Vendor Approval Flow

#### As a Public Vendor:
1. Go to Sign Up page
2. Select "Public Vendor" account type
3. Fill in details and submit
4. You'll see: "Registration successful! Your account is pending approval..."
5. Try to sign in - you'll get: "Your vendor account is pending approval by the administrator"

#### As Master Admin:
1. Sign in as Master Admin
2. Click "Vendor Approvals" in sidebar
3. See the pending vendor request
4. Click "Approve" or "Reject"
5. Confirm the action

#### After Approval:
1. Public vendor can now sign in successfully
2. They have full access to the dashboard
3. Their vendor status shows as "active"

### Testing CSV Upload
1. Sign in to any account
2. Go to Inventory page
3. Click "Actions" dropdown
4. Select "Upload CSV"
5. Choose a CSV file with the correct format:
   ```csv
   Country,SKU,Name,Description,Type,Vendor,Stock,Unit Cost,Listing URL
   USA,PROD-001,Product Name,Description,Electronics,Vendor Name,100,25.99,https://example.com
   ```

## Security Features

1. **Master Admin Only Access:**
   - Vendor Approvals page checks for `master_admin` role
   - API endpoints verify role before processing

2. **Sign-in Prevention:**
   - Pending vendors cannot sign in
   - Rejected vendors cannot sign in
   - Clear error messages for each scenario

3. **Invited Vendors:**
   - Vendors invited by admins are automatically approved
   - No need for Master Admin approval for invited vendors

## Database Changes

### Vendor Schema:
```javascript
approvalStatus: {
  type: String,
  enum: ['pending', 'approved', 'rejected'],
  default: 'approved'  // For existing vendors and invited vendors
}
```

### User Schema:
```javascript
role: {
  type: String,
  enum: ['owner', 'team_member', 'public_vendor', 'master_admin'],
  default: 'owner'
}
```

## API Endpoints Summary

| Endpoint | Method | Access | Purpose |
|----------|--------|--------|---------|
| `/api/admin/seed-master` | POST | Public | Create Master Admin account |
| `/api/admin/pending-vendors` | GET | Master Admin | Get pending vendors |
| `/api/admin/approve-vendor` | POST | Master Admin | Approve/Reject vendor |
| `/api/auth/signup` | POST | Public | User/Vendor registration |
| `/api/products/upload` | POST | Authenticated | Upload products CSV |

## Notes

1. **CSV Upload:** The CSV upload was already working. Make sure vendors exist in the database before uploading products.

2. **Master Admin:** Can only be created once. Subsequent attempts will return "Master Admin already exists".

3. **Existing Vendors:** All existing public vendors will have `approvalStatus: 'approved'` by default.

4. **Master Admin View:** Master Admin sees all the same pages as regular users, plus the "Vendor Approvals" page.

## Troubleshooting

### CSV Upload Not Working:
1. Check console for errors
2. Ensure vendors exist in database
3. Verify CSV format matches template
4. Check network tab for API response

### Vendor Can't Sign In:
1. Check vendor's `approvalStatus` in database
2. Ensure status is `'approved'` not `'pending'`
3. Verify `isActive` is `true`

### Master Admin Page Not Showing:
1. Clear browser cache and cookies
2. Sign out and sign in again
3. Check session has `role: 'master_admin'`

## Future Enhancements

Potential improvements:
1. Email notifications when vendors are approved/rejected
2. Bulk approve/reject functionality
3. Vendor application notes/comments
4. Approval history/audit log
5. Auto-approval after certain conditions

---

**Implementation Date:** December 24, 2025
**Status:** ✅ Complete and Functional
