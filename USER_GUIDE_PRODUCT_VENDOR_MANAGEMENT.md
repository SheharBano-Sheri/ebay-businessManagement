# Quick User Guide - Product & Vendor Management

## For All Users (Business Users)

### Managing Your Inventory

#### Delete Single Product
1. Go to **Dashboard > Inventory**
2. Find the product you want to remove
3. Click the trash icon (🗑️) in the Actions column
4. Confirm deletion

#### Bulk Delete Products
1. Go to **Dashboard > Inventory**
2. Check the boxes next to products you want to remove
3. Click **"Delete Selected (X)"** button at the top
4. Confirm bulk deletion
5. All selected products will be removed

### Managing Your Vendors

#### Remove a Public Vendor from Your Account
1. Go to **Dashboard > Vendors**
2. Switch to **"My Vendors"** tab
3. Find the vendor you want to remove
4. Click the trash icon (🗑️) button
5. Confirm removal
6. The vendor will be removed from your account (products remain until you delete them)

#### Delete Private/Virtual Vendor
1. Go to **Dashboard > Vendors**
2. Switch to **"My Vendors"** tab
3. Find the private/virtual vendor
4. Click the trash icon (🗑️) button
5. Confirm deletion
6. Vendor will be permanently deleted

---

## For Master Admins Only

### Hide/Unhide Public Vendors

#### Method 1: From Marketplace
1. Go to **Dashboard > Vendors**
2. Stay on **"Marketplace"** tab
3. Find the vendor you want to hide
4. Click **"Hide Vendor"** button (red)
5. Confirm action
6. Vendor will be hidden from all users

**To Unhide:**
- Same steps, but click **"Unhide Vendor"** button (green)

#### Method 2: From Vendor Approvals
1. Go to **Dashboard > Vendor Approvals**
2. Click on **"Approved Vendors"** tab
3. Find the vendor you want to hide
4. Click **"Hide"** or **"Unhide"** button
5. Confirm action

**What happens when you hide a vendor?**
- Regular users can no longer see the vendor in the marketplace
- Users who already added the vendor can still access their products
- The vendor's account remains active but invisible
- You can unhide them anytime

**Visual Indicators:**
- Hidden vendors show a red "Hidden" badge
- Hidden vendors have a red background in the approved vendors list
- Regular users won't see them at all

---

## Important Notes

### Product Deletion
- ⚠️ Deleted products cannot be recovered
- Always confirm you're deleting the right products
- Use bulk delete for efficiency when removing multiple items
- Products are only removed from your inventory, not the entire system

### Vendor Removal
- Removing a public vendor only removes them from YOUR vendor list
- Other users can still see and use the same vendor
- Your products from that vendor remain in inventory
- To also remove products, delete them separately

### Vendor Hide/Unhide (Master Admin)
- Hiding is system-wide - affects all users
- Use for vendors with unethical practices
- Hidden vendors can still log in but won't appear in marketplace
- Always document why you're hiding a vendor
- Unhide when issues are resolved

---

## Permissions Required

| Action | Permission Required |
|--------|-------------------|
| Delete products | Inventory: Edit |
| Bulk delete products | Inventory: Edit |
| Remove vendor from account | Account owner |
| Delete private/virtual vendor | Vendor owner |
| Hide/unhide public vendors | Master Admin role |

---

## Troubleshooting

**"You don't have permission" error:**
- Check your user role and permissions
- Contact your admin if you need higher permissions

**Can't remove a vendor:**
- Ensure you're the owner of that vendor
- Public vendors can only be removed from your list, not deleted
- Master admins should use hide/unhide for public vendors

**Products still showing after vendor removal:**
- This is normal - vendor removal doesn't delete products
- Delete products separately if needed

**Hidden vendor still visible:**
- Check you're using a master admin account
- Refresh the page
- Clear browser cache

---

## Best Practices

1. **Before Bulk Delete:**
   - Review your selection carefully
   - Export data if you might need it later
   - Start with small batches for testing

2. **Before Removing Vendors:**
   - Check if you have pending orders
   - Export vendor-related data if needed
   - Communicate with team members

3. **Before Hiding Vendors (Master Admin):**
   - Document the reason
   - Check how many users have added this vendor
   - Consider communication with affected users
   - Review their product listings first

---

*For additional support, contact your system administrator.*
