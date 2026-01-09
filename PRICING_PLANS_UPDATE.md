# Pricing Plans Update

## Overview
The pricing structure has been updated to better reflect the business requirements and team collaboration needs. This document outlines the new pricing plans and their features.

## New Pricing Structure

### 1. Personal Plan
**Price:** $9/month (billed monthly) or $8/month (billed yearly)

**Target Audience:** Solo entrepreneurs starting their business journey

**Key Features:**
- **Single user only** - No team members allowed
- Up to 5 store monitors
- Real-time inventory sync
- Basic analytics dashboard
- Email support (24hr response)
- Standard API access

**Backend Limit:** `personal: 0` (zero team members)

**Use Case:** Individual sellers who manage their business alone and don't need team collaboration.

---

### 2. Enterprise Plan
**Price:** $29/month (billed monthly) or $24/month (billed yearly)

**Target Audience:** Growing teams ready to scale their business

**Key Features:**
- **Up to 10 active team members + 1 Admin** (11 total users)
- Unlimited store monitors
- Automated order processing
- Advanced team permissions
- Priority email & chat support
- Custom integrations

**Backend Limit:** `enterprise: 10` (10 team members + 1 admin)

**Use Case:** Small to medium teams that need collaboration features with role-based permissions.

**Note:** This plan is marked as "Popular" in the UI.

---

### 3. Premium Plan
**Price:** Contact for Pricing (Custom pricing)

**Target Audience:** Large-scale operations with extensive needs

**Key Features:**
- **Unlimited team members**
- Dedicated account manager
- Custom API rate limits
- Advanced security & compliance
- Custom feature development
- 24/7 priority support

**Backend Limit:** `premium: Infinity` (unlimited team members)

**Use Case:** Enterprise-level businesses requiring custom solutions and unlimited scalability.

---

### 4. Public Vendor Plan
**Price:** Free to join

**Target Audience:** Marketplace vendors supplying products to business users

**Key Features:**
- Marketplace vendor account
- **No team members** (individual vendor account)
- Manage your product catalog
- Connect with multiple buyers
- Track purchase orders
- Vendor dashboard & analytics

**Backend Limit:** `public_vendor: 0` (cannot add team members)

**Use Case:** Individual suppliers who want to list their products for business users to purchase from.

**Special Conditions:**
- Account starts as inactive until approved by master admin
- Vendor approval status starts as "pending"
- No team collaboration features

---

## Technical Implementation

### Frontend Changes

#### 1. Home Page (`src/app/page.js`)
- Updated `PRICING_PLANS` array with all four plans
- Changed grid layout from 3 columns to 4 columns (`lg:grid-cols-4`)
- Updated max-width from `max-w-4xl` to `max-w-6xl`
- All plans display static information with "View plan details" message
- Added Public Vendor as the 4th plan card

#### 2. Signup Page (`src/app/auth/signup/page.jsx`)
- Updated plan selection cards to match new structure
- Changed plan values: `personal`, `enterprise`, `premium` (removed `pro`)
- Updated pricing display: Personal ($9), Enterprise ($29), Premium (Contact for Pricing)
- Enhanced Public Vendor tab with detailed plan card showing features
- Team limits clearly stated in each plan card

### Backend Changes

#### 1. Team Management API (`src/app/api/team/route.js`)
Updated plan limits logic:
```javascript
const planLimits = {
  personal: 0,        // Single user only, no team members
  enterprise: 10,     // Up to 10 active team members
  premium: Infinity   // Unlimited team members
};
```

Updated error messages:
- Personal: "Personal plan is for single users only and does not allow team members..."
- Enterprise: "Enterprise plan allows a maximum of 10 active team members..."
- Public Vendor: "Public Vendors cannot add team members. This is an individual account type."

#### 2. Accounts API (`src/app/api/accounts\route.js`)
- Changed plan name check from `'Personal'` (capitalized) to `'personal'` (lowercase) for consistency
- Updated error message to reference Enterprise or Premium plans

### Database Considerations

**User Model (`membershipPlan` field):**
Valid values:
- `'personal'` - Single user, no team
- `'enterprise'` - Up to 10 team members
- `'premium'` - Unlimited team members
- `'invited'` - For team members who joined via invitation

**Team Member Limits:**
- The system counts active team members using: `TeamMember.countDocuments({ adminId, status: 'active' })`
- Limit is enforced before creating new team invitations
- The admin user is not counted against the team member limit

---

## Migration Notes

### Existing Users
If you have existing users with the old `'pro'` plan:

1. **Option 1 - Data Migration Script:**
   ```javascript
   // Update all 'pro' plans to 'enterprise'
   await User.updateMany(
     { membershipPlan: 'pro' },
     { $set: { membershipPlan: 'enterprise' } }
   );
   ```

2. **Option 2 - Backward Compatibility:**
   Add fallback in plan limits logic:
   ```javascript
   const planLimits = {
     personal: 0,
     pro: 10,         // Legacy support
     enterprise: 10,
     premium: Infinity
   };
   ```

### Validation
- All changes have been tested with no compilation errors
- Plan names are now consistent across frontend and backend (lowercase)
- Error messages clearly explain limits and upgrade paths

---

## User Experience Flow

### Business User Signup Flow:
1. User visits home page and sees all 4 pricing plans
2. Clicks "Get Started" button
3. On signup page, selects "Business User" tab
4. Chooses between Personal, Enterprise, or Premium plan
5. Completes registration with selected plan
6. Personal users cannot add team members
7. Enterprise users can add up to 10 team members
8. Premium users have unlimited team members

### Public Vendor Signup Flow:
1. User visits home page and sees Public Vendor plan
2. Clicks "Get Started" button
3. On signup page, selects "Public Vendor" tab
4. Sees Public Vendor plan details (Free, no team members)
5. Completes registration
6. Account starts as inactive/pending approval
7. Cannot add team members (individual account type)

---

## Benefits of New Structure

### Business Benefits:
1. **Clear Value Proposition:** Each plan has distinct features and pricing
2. **Natural Upgrade Path:** Personal → Enterprise → Premium
3. **Marketplace Expansion:** Public Vendor plan attracts suppliers
4. **Revenue Model:** Three paid tiers + free vendor tier for ecosystem growth

### Technical Benefits:
1. **Consistent Naming:** All plan identifiers are lowercase
2. **Scalable Limits:** From 0 to 10 to unlimited
3. **Role-Based Logic:** Different rules for vendors vs business users
4. **Clear Validation:** Backend enforces limits with specific error messages

### User Benefits:
1. **Transparent Pricing:** Clear cost structure on home page
2. **Flexible Options:** From solo to unlimited team sizes
3. **Vendor Opportunity:** Free plan for suppliers to join marketplace
4. **Upgrade Guidance:** Error messages explain upgrade paths

---

## Testing Checklist

- [x] Home page displays all 4 plans correctly
- [x] Signup page shows correct plan options for business users
- [x] Signup page shows public vendor plan details
- [x] Backend enforces personal plan (0 team members)
- [x] Backend enforces enterprise plan (10 team members max)
- [x] Backend allows unlimited for premium plan
- [x] Backend prevents public vendors from adding team members
- [x] Error messages provide clear guidance
- [x] No compilation errors in any modified files

---

## Future Considerations

### Potential Enhancements:
1. **Plan Upgrade Flow:** Allow users to upgrade their plan from settings
2. **Usage Analytics:** Show team member usage vs limit
3. **Billing Integration:** Connect to Stripe or similar payment processor
4. **Trial Period:** Implement free trial for Enterprise/Premium plans
5. **Feature Gating:** Conditional feature access based on plan

### Monitoring:
1. Track plan distribution (how many users per plan)
2. Monitor upgrade conversions (Personal → Enterprise → Premium)
3. Track public vendor registrations and approval rates
4. Analyze team member usage across plans

---

## Support & Documentation

For questions or issues:
- Check this document for plan details
- Review error messages for upgrade guidance
- Contact support for Premium plan custom pricing
- See TEAM_INVITATION_GUIDE.md for team management details

Last Updated: January 2025
