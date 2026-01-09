# GenieBMS Setup Guide

## Quick Start Checklist

- [ ] Install Node.js 18+
- [ ] Install MongoDB
- [ ] Clone project and install dependencies
- [ ] Create `.env.local` file
- [ ] Start MongoDB
- [ ] Run development server
- [ ] Create your first account

## Detailed Setup Instructions

### Step 1: Install Prerequisites

#### Install Node.js
Download and install Node.js 18 or higher from [nodejs.org](https://nodejs.org/)

Verify installation:
```bash
node --version
npm --version 
```

#### Install MongoDB

**Option A: Local Installation**

Windows:
- Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
- Run installer
- Start MongoDB: `mongod`

Mac (using Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Option B: MongoDB Atlas (Cloud)**
1. Create free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create cluster
3. Get connection string
4. Use in `.env.local`

### Step 2: Project Setup

```bash
# Navigate to project directory
cd ebay-bms

# Install all dependencies
npm install
```

If you get errors, try:
```bash
npm install --legacy-peer-deps
```

### Step 3: Environment Configuration

Create `.env.local` in the project root:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/ebay-bms

# Authentication (generate secret with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://localhost:3000

# Fake APIs (for testing)
FAKE_EMAIL_API_KEY=test-email-key
FAKE_PAYMENT_API_KEY=test-payment-key
CURRENCY_EXCHANGE_API_KEY=test-currency-key
```

#### Generate NEXTAUTH_SECRET

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Mac/Linux:**
```bash
openssl rand -base64 32
```

### Step 4: Start the Application

```bash
# Start development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Step 5: Create Your First Account

1. Navigate to [http://localhost:3000/auth/signup](http://localhost:3000/auth/signup)
2. Choose account type:
   - **Business User**: For managing your eBay business
   - **Public Vendor**: For becoming a marketplace vendor
3. Select membership plan (if Business User)
4. Fill in your details
5. Click "Create Account"

## Usage Guide

### Creating Your First Inventory Item

1. Sign in to your account
2. Go to **Dashboard > Inventory**
3. Click "Add Product"
4. Fill in:
   - SKU (unique identifier)
   - Product Name
   - Vendor (select or create)
   - Stock quantity
   - Unit cost
5. Click "Add Product"

### Importing Orders via CSV

1. Go to **Dashboard > Orders**
2. Click "Upload CSV"
3. Select your CSV file with format:
   ```csv
   Date,Order #,SKU,Item,Qty,Gross Amount,Fees,Sourcing Cost,Shipping Cost
   ```
4. System will:
   - Import orders
   - Calculate profits automatically
   - Link to products by SKU

### Adding Vendors from Marketplace

1. Go to **Dashboard > Vendors**
2. Browse the "Marketplace" tab
3. Click "Add to My Vendors" on any vendor
4. Vendor will appear in "My Vendors" tab

### Managing Team Members (Pro/Enterprise Plans)

1. Go to **Dashboard > Team**
2. Click "Invite Member"
3. Enter email and set permissions:
   - Orders (View/Edit)
   - Inventory (View/Edit)
   - Vendors (View/Edit)
   - Accounts (View/Edit)
   - Payments (View/Edit)
4. Send invitation

## Common Issues & Solutions

### Issue: Cannot connect to MongoDB

**Solution:**
- Ensure MongoDB is running: `mongod`
- Check `MONGODB_URI` in `.env.local`
- For Atlas, ensure IP is whitelisted

### Issue: NextAuth error

**Solution:**
- Verify `NEXTAUTH_SECRET` is set in `.env.local`
- Ensure `NEXTAUTH_URL` matches your development URL
- Restart development server

### Issue: Module not found errors

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Find and kill process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill
```

Or run on different port:
```bash
PORT=3001 npm run dev
```

## Sample Data for Testing

### Sample Orders CSV
Create `sample-orders.csv`:

```csv
Date,Order #,SKU,Item,Qty,Gross Amount,Fees,Sourcing Cost,Shipping Cost
12/01/2024,ORD-001,SKU-001,Gaming Mouse,1,49.99,4.99,20.00,5.00
12/02/2024,ORD-002,SKU-002,Keyboard,1,89.99,8.99,35.00,8.00
12/03/2024,ORD-003,SKU-001,Gaming Mouse,2,99.98,9.99,40.00,10.00
12/04/2024,ORD-004,SKU-003,Monitor,1,299.99,29.99,150.00,25.00
```

### Sample Products
Before importing orders, create these products:
- SKU: SKU-001, Name: Gaming Mouse, Unit Cost: $20
- SKU: SKU-002, Name: Keyboard, Unit Cost: $35
- SKU: SKU-003, Name: Monitor, Unit Cost: $150

## Next Steps

1. ✅ Set up your account
2. ✅ Add some products to inventory
3. ✅ Import sample orders
4. ✅ Explore the dashboard analytics
5. ✅ Add vendors from marketplace
6. ✅ Invite team members (if Pro/Enterprise)

## Getting Help

If you encounter any issues:
1. Check this setup guide
2. Review the main README.md
3. Check the requirements.md for feature details
4. Open an issue on GitHub

## Production Deployment

For deploying to production:
1. Use MongoDB Atlas (cloud database)
2. Deploy to Vercel or similar platform
3. Set environment variables in hosting platform
4. Update `NEXTAUTH_URL` to production URL
5. Use strong `NEXTAUTH_SECRET`

---

Happy selling! 🚀
