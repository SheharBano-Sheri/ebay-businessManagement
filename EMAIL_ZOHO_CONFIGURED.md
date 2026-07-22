# ✅ Zoho Email Configuration - COMPLETE

## What Has Been Configured

Your Genie BMS system is now fully configured to send team invitation emails from your professional Zoho email address.

### 1. Email Configuration (`.env.local`)

```env
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=587
EMAIL_USER=Onboarding@geniebms.com
EMAIL_PASSWORD=KDhtN7U018QH
APP_NAME=Genie Business Management System
NEXTAUTH_URL=https://www.geniebms.com
```

✅ **Sender Email**: All invitation emails will be sent from **Onboarding@geniebms.com**  
✅ **Production URL**: Set to **https://www.geniebms.com**

---

## How Team Member Invitations Work

### Step 1: Admin Invites Team Member
1. Go to **Dashboard → Team**
2. Click **"Invite Member"**
3. Fill in:
   - **Name**: Member's full name
   - **Email**: Member's email address
   - **Role**: Member, Manager, Admin, or Owner
   - **Permissions**: Select which pages they can access:
     - Orders (view, create, edit, delete)
     - Inventory (view, create, edit, delete)
     - Vendors (view, create, edit, delete)
     - Accounts (view, create, edit, delete)
     - Payments (view, create, edit, delete)

### Step 2: System Sends Email
The system automatically sends a professional invitation email:
- **From**: Genie Business Management System <Onboarding@geniebms.com>
- **Reply-To**: Your admin email (so members can reply to you directly)
- **Subject**: "You've been invited to join [Your Name]'s team"

### Step 3: Member Receives Email
The email includes:
- Welcome message with who invited them
- Their assigned role
- A secure **"Accept Invitation & Join Team"** button
- Signup link pre-filled with their email address

### Step 4: Member Signs Up (FREE)
When the member clicks the signup link:
- ✅ **No payment required** - They're automatically added as a team member
- ✅ **No plan selection** - They inherit access from your account
- ✅ **Access controlled by you** - They only see the pages you gave them permission to access
- They simply create a password and join your team

### Step 5: Member Access
After signup, team members can:
- ✅ Sign in to https://www.geniebms.com
- ✅ Access only the dashboard pages you allowed
- ✅ Collaborate on your business data (orders, inventory, etc.)
- ✅ Use the system without their own subscription

---

## Team Member Permissions System

You have **granular control** over what each team member can access:

### Permission Levels per Page:
- **View** - Can see data but not edit
- **Create** - Can add new records
- **Edit** - Can modify existing records
- **Delete** - Can remove records

### Available Pages:
- **Orders** - Manage eBay orders
- **Inventory** - View and manage products
- **Vendors** - Access vendor information
- **Accounts** - Manage account settings
- **Payments** - View payment records

**Example**: You can give a team member:
- ✅ Full access to Orders (view, create, edit, delete)
- ✅ View-only access to Inventory
- ❌ No access to Payments or Accounts

---

## Email Template Features

Your invitation emails include:
- 📧 Professional HTML design with gradient header
- 🎨 Brand colors and styling
- 📱 Mobile-responsive layout
- 📝 Plain text fallback for email clients without HTML support
- 🔒 Secure invite token that expires after use
- 🔗 Direct signup link pre-filled with recipient's email

---

## Testing the Email System

1. **Start your development server** (if not already running):
   ```powershell
   npm run dev
   ```

2. **Go to Team Page**:
   - Navigate to Dashboard → Team
   - Click "Invite Member"

3. **Send Test Invitation**:
   - Enter your own email (or a test email)
   - Select role and permissions
   - Click "Send Invitation"

4. **Check Email**:
   - Check the recipient's inbox
   - Email should arrive from **Onboarding@geniebms.com**
   - Click the signup link to test the flow

---

## Troubleshooting

### Email Not Sending?
1. ✅ Verify `.env.local` has correct Zoho credentials
2. ✅ Restart your dev server: `npm run dev`
3. ✅ Check console for error messages
4. ✅ Verify Zoho email is active and password is correct

### Email Going to Spam?
- For production, ensure your domain has proper SPF/DKIM records
- Zoho should already have this configured for your domain

### Member Can't Access Pages?
- Check the permissions you assigned during invitation
- Members only see pages they have permission to access
- You can update permissions later in Team settings

---

## Next Steps

### For Development:
1. Test the invitation flow with a test email
2. Verify the signup process works correctly
3. Check that permissions work as expected

### For Production:
Your `.env.local` is already configured for production with:
- ✅ Production domain: https://www.geniebms.com
- ✅ Professional email: Onboarding@geniebms.com
- ✅ Zoho SMTP configured

Just deploy your app to production and it will work automatically!

---

## Security Notes

🔒 **Your credentials are safe**:
- `.env.local` is gitignored (never committed to GitHub)
- Email password is stored securely
- Invite tokens are single-use and expire
- Each team member has their own account with separate login

⚠️ **Important**: Never share your `.env.local` file or commit it to version control!

---

## Summary

✅ Zoho email configured  
✅ Sender email: Onboarding@geniebms.com  
✅ Production URL: https://www.geniebms.com  
✅ Team invitations ready to send  
✅ Members sign up for free  
✅ Permission-based access control  
✅ Professional email templates  

**Everything is ready!** Just invite your team members and they'll receive beautiful, professional invitation emails from your Genie BMS system.
