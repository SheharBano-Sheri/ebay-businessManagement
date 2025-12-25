# GenieBMS - Business Management System

A comprehensive business management dashboard designed for online sellers. Manage inventory, orders, vendors, payments, teams, and analytics in a single web-based system.

## 🚀 Features

### Core Features
- **Multi-Tenant System**: Secure tenant isolation with admin-scoped data
- **Authentication**: Email/password authentication with NextAuth
- **Role-Based Access Control**: Owner, Team Member, and Vendor roles
- **Membership Plans**: Personal, Pro, and Enterprise tiers

### Modules

#### 1. **Orders Management**
- CSV upload for bulk order import
- Automatic profit/loss calculations
- Real-time order tracking
- Columns: Date, Order #, SKU, Item, Qty, Type, Gross Amount, Fees, Sourcing Cost, Shipping Cost, Gross Profit
- Filtering by date range, account, and currency

#### 2. **Inventory Management**
- Product catalog with SKU tracking
- Stock level monitoring
- Vendor assignment
- Cost tracking (Unit Cost & Total Cost)
- Low stock alerts
- Badge indicators for stock status

#### 3. **Vendor Marketplace**
- Browse public vendors
- Add vendors to your account (private vendors)
- Virtual vendor for self-sourced products
- Vendor details and contact information

#### 4. **Team Management**
- Invite team members (Pro & Enterprise plans)
- Module-level permissions (View/Edit)
- Permission modules: Orders, Inventory, Vendors, Accounts, Payments
- Team activity audit trails

#### 5. **Payments Tracking**
- Vendor payments
- Subscription payments
- Payment status: Pending, Paid, Failed, Refunded
- Due date tracking

#### 6. **Analytics Dashboard**
- KPI Cards: Gross Revenue, Net Profit, Inventory Value, Total Orders
- Charts and visualizations
- Financial summaries
- Real-time statistics

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **CSV Parsing**: PapaParse
- **Icons**: Lucide React, Tabler Icons

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud instance)

### Setup Steps

1. **Install dependencies**
```bash
npm install
```

2. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/ebay-bms
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl
NEXTAUTH_URL=http://localhost:3000
FAKE_EMAIL_API_KEY=fake-email-key
FAKE_PAYMENT_API_KEY=fake-payment-key
CURRENCY_EXCHANGE_API_KEY=fake-currency-key
```

To generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

3. **Start MongoDB**

If using local MongoDB:
```bash
mongod
```

Or use MongoDB Atlas (cloud) and update `MONGODB_URI` accordingly.

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Schema

The application uses the following MongoDB collections:

- **users**: User accounts (admin, team members, public vendors)
- **teams**: Team definitions
- **team_members**: Team membership and permissions
- **vendors**: Vendor relationships (public, private, virtual)
- **products**: Product inventory
- **ebayorders**: eBay order transactions
- **payments**: Payment tracking

## 🔐 Authentication Flow

1. **Sign Up** (`/auth/signup`)
   - Choose account type: Business User or Public Vendor
   - Select membership plan (for business users)
   - Create account with email/password

2. **Sign In** (`/auth/signin`)
   - Email/password authentication
   - JWT session management

3. **Dashboard** (`/dashboard`)
   - Role-based access to features
   - Session protected routes

## 📊 Account Types & Plans

### Account Types

1. **Business User (Admin)**
   - Manages inventory, orders, and teams
   - Access to full dashboard features
   - Can add vendors from marketplace

2. **Public Vendor**
   - Marketplace presence
   - Products visible to all admins
   - Can be added to multiple accounts

### Membership Plans

| Plan | Team Members | Price | Features |
|------|--------------|-------|----------|
| Personal | 0 | Free | Solo usage, basic features |
| Pro | Up to 10 | $29/month | Team collaboration, full features |
| Enterprise | Unlimited | $99/month | Priority support, advanced analytics |

## 🔑 Key Concepts

### Vendor Types

1. **Public Vendor**: Marketplace vendor available to all users
2. **Private Vendor**: Vendor added by admin from marketplace (linked to admin only)
3. **Virtual Vendor**: Auto-created for admin (represents self-sourced products)

### Data Ownership

All data is scoped by `adminId` to ensure:
- Tenant isolation
- Security
- Data privacy
- No cross-tenant data leakage

## 📝 CSV Upload Format

### Orders CSV Format

Required columns:
```csv
Date,Order #,SKU,Item,Qty,Gross Amount,Fees,Sourcing Cost,Shipping Cost
```

Example:
```csv
01/12/2024,12345,SKU-001,Product Name,2,299.99,29.99,100.00,15.00
02/12/2024,12346,SKU-002,Another Product,1,149.99,14.99,50.00,10.00
```

## 🚦 API Routes

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/[...nextauth]` - NextAuth authentication
- `GET/POST /api/vendors` - Manage vendors
- `GET/POST /api/products` - Manage inventory
- `GET/POST /api/orders` - Manage orders
- `POST /api/orders/upload` - CSV upload
- `GET/POST /api/payments` - Manage payments
- `GET /api/analytics` - Get dashboard analytics

## 🎨 Pages Structure

```
/                         # Landing page
/auth/signup             # Sign up with account type selection
/auth/signin             # Sign in
/dashboard               # Analytics dashboard
/dashboard/orders        # Orders management
/dashboard/inventory     # Inventory management
/dashboard/vendors       # Vendor marketplace
/dashboard/payments      # Payments tracking
/dashboard/team          # Team management
```

## 📄 License

MIT License

---

Built with ❤️ using Next.js and MongoDB


This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
