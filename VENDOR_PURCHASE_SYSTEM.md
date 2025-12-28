# Vendor Product Purchase System

## Overview
This system allows users to browse vendor inventory, search products by SKU, and purchase products from added vendors with document upload capabilities.

## Features Implemented

### 1. Vendor Inventory Page
**Location:** `/dashboard/vendors/[vendorId]/inventory`

- Displays all approved products from a specific vendor
- Search functionality by SKU
- Table view with product details:
  - SKU
  - Product Name
  - Description
  - Stock availability
  - Unit Cost
  - Buy button for each product
- Navigation back to vendors page

### 2. Product Purchase Page
**Location:** `/dashboard/vendors/[vendorId]/purchase/[productId]`

- Product details snapshot
- Quantity selector with validation
- Real-time total cost calculation
- Multiple file upload support for:
  - **Payment Proof** (Required) - Multiple files
  - **Shipping Label** (Optional) - Multiple files
  - **Packing Slip** (Optional) - Multiple files
- Supported file formats: PDF, JPG, JPEG, PNG, DOC, DOCX
- File preview with size display
- Remove file option
- Additional notes field
- Complete purchase submission

### 3. Backend API
**Location:** `/api/vendor-purchases`

#### POST - Create Purchase Order
- Validates vendor and product
- Checks stock availability
- Processes multiple file uploads
- Stores files in `/public/uploads/vendor-purchases/`
- Creates purchase record with:
  - Product snapshot
  - Quantity and total cost
  - All uploaded documents
  - Purchase status (pending)

#### GET - Retrieve Purchase Orders
- Query parameters:
  - `vendorId` - Filter by vendor
  - `status` - Filter by status
- Returns purchases with populated vendor and product data

### 4. Database Model
**Location:** `/models/VendorPurchase.js`

Schema includes:
- Admin ID (ownership)
- Vendor and Product references
- Product snapshot (preserves pricing at purchase time)
- Quantity and total cost
- Document arrays (payment proofs, shipping labels, packing slips)
- Notes
- Status tracking (pending, processing, completed, cancelled)
- Timestamps

### 5. Updated Vendors Page
**Location:** `/dashboard/vendors/page.jsx`

- "View Products" button now navigates to inventory page
- Removed popup dialog
- Cleaner navigation flow

## User Flow

1. **Browse Vendors**
   - User navigates to `/dashboard/vendors`
   - Views "My Vendors" tab
   - Clicks "View Products" on any added vendor

2. **View Vendor Inventory**
   - Redirected to `/dashboard/vendors/[vendorId]/inventory`
   - Sees all approved products in table format
   - Can search by SKU using search bar
   - Each product shows stock status and cost

3. **Initiate Purchase**
   - Clicks "Buy" button on desired product
   - Redirected to `/dashboard/vendors/[vendorId]/purchase/[productId]`

4. **Complete Purchase**
   - Views product details
   - Selects quantity (validates against stock)
   - Uploads payment proof (required)
   - Optionally uploads shipping labels and packing slips
   - Can upload multiple files for each category
   - Adds additional notes if needed
   - Clicks "Complete Purchase"

5. **Purchase Confirmation**
   - Purchase order created with status "pending"
   - Files stored securely
   - User redirected back to vendor inventory
   - Success notification shown

## File Upload Specifications

- **Maximum File Size:** 10MB per request (configurable in next.config.mjs)
- **Accepted Formats:** .pdf, .jpg, .jpeg, .png, .doc, .docx
- **Multiple Files:** Yes, for all document types
- **Storage Location:** `/public/uploads/vendor-purchases/`
- **Filename Pattern:** `{timestamp}-{random}.{extension}`

## Configuration Changes

### next.config.mjs
```javascript
experimental: {
  serverActions: {
    bodySizeLimit: '10mb',
  },
}
```

## API Endpoints

### POST /api/vendor-purchases
**Request:** FormData
- `vendorId` - Vendor ID
- `productId` - Product ID
- `quantity` - Purchase quantity
- `notes` - Additional notes (optional)
- `paymentProofs` - File array (required)
- `shippingLabels` - File array (optional)
- `packingSlips` - File array (optional)

**Response:**
```json
{
  "success": true,
  "purchase": { /* Purchase object */ },
  "message": "Purchase order created successfully"
}
```

### GET /api/vendor-purchases
**Query Parameters:**
- `vendorId` - Filter by vendor
- `status` - Filter by status

**Response:**
```json
{
  "purchases": [
    {
      "_id": "...",
      "vendorId": { "name": "...", "email": "..." },
      "productId": { "sku": "...", "name": "..." },
      "quantity": 5,
      "totalCost": 150.00,
      "status": "pending",
      "paymentProofs": [...],
      "createdAt": "..."
    }
  ]
}
```

## Security Features

- Authentication required for all endpoints
- User ownership validation (adminId)
- Vendor and product existence verification
- Stock availability checking
- File type validation
- Secure file storage with unique filenames

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── vendor-purchases/
│   │       └── route.js (NEW)
│   └── dashboard/
│       └── vendors/
│           ├── page.jsx (UPDATED)
│           └── [vendorId]/
│               ├── inventory/
│               │   └── page.jsx (NEW)
│               └── purchase/
│                   └── [productId]/
│                       └── page.jsx (NEW)
├── models/
│   └── VendorPurchase.js (NEW)
└── ...

public/
└── uploads/
    └── vendor-purchases/ (AUTO-CREATED)
```

## Future Enhancements

- Purchase order management dashboard
- Status update functionality
- Email notifications for vendors
- Bulk purchase support
- Purchase history view
- PDF receipt generation
- Integration with inventory management

## Testing Checklist

- [ ] Navigate to vendor inventory page
- [ ] Search products by SKU
- [ ] Click buy button on product
- [ ] Upload single payment proof
- [ ] Upload multiple payment proofs
- [ ] Upload optional documents
- [ ] Remove uploaded files
- [ ] Adjust quantity
- [ ] Submit purchase order
- [ ] Verify file storage
- [ ] Check database record
- [ ] Test stock validation
- [ ] Test with out-of-stock products

## Notes

- All products must be approved (`approvalStatus: 'approved'`) to be purchasable
- Purchase orders are created with "pending" status by default
- Files are stored in the public directory for easy access
- Product snapshot preserves pricing at time of purchase
- User must have at least one payment proof to complete purchase
