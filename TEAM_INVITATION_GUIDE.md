# Team Invitation System Guide

## Overview
The team invitation system allows admin users to invite team members with specific role-based permissions. Invited users receive an email and can sign up for free without selecting a plan.

## How It Works

### 1. **Inviting a Team Member**

**Admin Steps:**
1. Navigate to **Team Management** page (`/dashboard/team`)
2. Click **"Invite Member"** button
3. Fill in the form:
   - **Name**: Full name of the team member
   - **Email**: Their email address (they'll receive the invitation here)
   - **Role**: Choose from:
     - **Member**: Basic access (view only)
     - **Manager**: Can view and edit most areas
     - **Admin**: Full access to all modules
4. **Set Permissions**: Toggle access for each module:
   - **Orders**: View and manage eBay orders
   - **Inventory**: Manage product inventory
   - **Vendors**: Manage vendor relationships
   - **Accounts**: Manage eBay accounts
   - **Payments**: View payment information
5. Click **"Send Invitation"**

**What Happens:**
- System generates a unique invitation token
- Email is sent to the invited user with a special signup link
- Team member record is created with status "pending"
- Invitation is stored in the database

---

### 2. **Receiving the Invitation**

**Team Member Experience:**
1. Receives email with subject: **"You've been invited to join [Admin Name]'s team"**
2. Email contains:
   - Admin's name and email
   - Their assigned role
   - "Accept Invitation & Join Team" button/link
3. Clicks the link (format: `/auth/signup?token=xxx&email=xxx`)

---

### 3. **Signing Up via Invitation**

**Signup Page Features:**
- Pre-filled email address
- Shows who invited them
- Shows their assigned role
- No plan selection required (automatically set as invited member)

**Signup Form:**
1. **Name**: Full name (required)
2. **Email**: Pre-filled from invitation (read-only)
3. **Password**: Create a secure password
4. **Confirm Password**: Re-enter password

**Click "Create Account"**

**What Happens:**
- User account is created with role and permissions from invitation
- Team member status changes from "pending" to "active"
- Permissions are saved to the user's account
- User is automatically signed in
- Redirected to dashboard with their restricted access

---

### 4. **Permission-Based Access**

**Navigation Filtering:**
Team members only see pages they have permission to access:

| Role | Default Permissions |
|------|-------------------|
| **Member** | View: Orders, Inventory, Vendors |
| **Manager** | View + Edit: Orders, Inventory<br>View: Vendors, Accounts, Payments |
| **Admin** | View + Edit: All modules except Team |
| **Owner** | Full access including Team management |

**Custom Permissions:**
Admins can customize permissions for each user, overriding role defaults.

---

### 5. **What Team Members See**

**Sidebar Navigation:**
- Only modules they have "view" or "edit" access to
- Dashboard (always visible)
- Settings (always accessible)

**Module Access:**
- **View**: Can see data but cannot make changes
- **Edit**: Can create, update, and delete records
- **No Access**: Page not shown in navigation

**Example - Member with Orders & Inventory access:**
```
✓ Dashboard
✓ Orders (view only)
✓ Inventory (view only)
✗ Vendors (not shown)
✗ Accounts (not shown)
✗ Payments (not shown)
✗ Team (not shown)
✓ Settings (limited to profile)
```

---

### 6. **Managing Team Members**

**Admin Capabilities:**
- View all team members and their status
- Edit member roles and permissions
- Remove team members
- Resend invitations (if not accepted)
- See pending vs active members

**Edit Member Access:**
1. Click on a team member card
2. Modify their role
3. Toggle permissions for each module
4. Save changes

**Remove Member:**
1. Click trash icon on member card
2. Confirm removal
3. Member loses access immediately

---

### 7. **Plan Limits**

| Plan | Team Member Limit |
|------|-------------------|
| **Personal** | 0 (Solo usage only) |
| **Pro** | Up to 10 team members |
| **Enterprise** | Unlimited team members |

**Upgrade Prompt:**
Personal plan users will see an upgrade notice when trying to access Team Management.

---

### 8. **Email Configuration**

**Setup Options:**

**Option 1: Resend (Recommended)**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**Option 2: SMTP (Gmail, Outlook, etc.)**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

**No Email Setup:**
If neither is configured, the system will:
- Still create the invitation
- Skip sending email
- Show a warning to share the signup link manually

---

### 9. **Security Features**

**Invitation Tokens:**
- Unique 64-character random string
- Single-use tokens
- Can only be used by the specified email
- Expires when used or member removed

**Permission Enforcement:**
- Checked on server-side for all API routes
- Sidebar filtered client-side
- Direct URL access blocked by middleware

**Data Isolation:**
- Team members only see data from their admin's account
- Cannot access other users' teams
- Cannot invite additional members (unless given permission)

---

### 10. **Troubleshooting**

**Invitation email not received:**
- Check spam/junk folder
- Verify email configuration in `.env`
- Check server logs for email errors
- Share signup link manually if needed

**Cannot sign up:**
- Ensure invitation hasn't been used already
- Check if invitation was deleted
- Verify email matches the invited email exactly

**Limited access after signup:**
- Check assigned permissions in Team Management
- Contact admin to update permissions
- Verify role is correct

**Plan limit reached:**
- Admin needs to upgrade plan
- Remove inactive members to free slots
- Contact support for plan changes

---

## Technical Details

### Database Models

**User Model** (stores permissions):
```javascript
{
  email: String,
  name: String,
  role: String,
  permissions: {
    orders: [String],      // ['view', 'edit']
    inventory: [String],
    vendors: [String],
    accounts: [String],
    payments: [String],
    team: [String]
  },
  adminId: ObjectId  // References the owner
}
```

**TeamMember Model** (tracks invitations):
```javascript
{
  adminId: ObjectId,
  email: String,
  name: String,
  role: String,
  status: String,  // 'pending' | 'active' | 'inactive'
  inviteToken: String,
  permissions: Object,
  invitedAt: Date,
  acceptedAt: Date
}
```

### API Endpoints

- `POST /api/team` - Create invitation
- `GET /api/team` - List team members
- `PATCH /api/team/:id` - Update member permissions
- `DELETE /api/team/:id` - Remove member
- `GET /api/team/verify-invite` - Verify invitation token
- `POST /api/auth/signup` - Sign up (handles invitations)

---

## Best Practices

1. **Use specific roles**: Assign the minimum permissions needed
2. **Regular audits**: Review team member access quarterly
3. **Remove inactive members**: Free up plan slots
4. **Clear naming**: Use full names for easy identification
5. **Test first**: Try inviting a test account before rolling out
6. **Document permissions**: Keep notes on why specific access was granted
7. **Use email**: Ensure email is configured for best user experience

---

## Future Enhancements

Potential improvements for the system:
- Multi-factor authentication for team members
- Activity logs and audit trails
- Temporary access (time-limited permissions)
- Permission templates for common roles
- Bulk invitation support
- Team member activity dashboard
- Permission inheritance and groups
