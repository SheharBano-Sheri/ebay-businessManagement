# Ebay-BMS – Product Requirement Plan

## 1. Overview

Ebay-BMS is a **business management dashboard** designed primarily for eBay sellers. It enables users to manage inventory, orders, vendors, payments, teams, and analytics in a single web-based system.

The system supports **multi-tenant usage**, **team-based access control**, **vendor marketplaces**, and **private product catalogs**, with clear ownership and audit trails.

## 2. User Types & Roles

### 2.1 Account Creation Modes

On signup, a user must choose one of the following:

1. **User (Manager / Admin)** – Runs a business, manages vendors, products, orders, teams
2. **Public Vendor** – Acts as a marketplace vendor whose products can be used by multiple users

### 2.2 User Roles

| Role               | Description                                           |
| ------------------ | ----------------------------------------------------- |
| **Owner (Admin)**  | Primary account owner, full access                    |
| **Team Member**    | Limited access based on permissions                   |
| **Public Vendor**  | Supplies products to users                            |
| **Virtual Vendor** | System-generated vendor representing the admin itself |

## 3. Membership Plans

### 3.1 User Plans

| Plan           | Team Members | Features                             |
| -------------- | ------------ | ------------------------------------ |
| **Personal**   | 0            | Solo usage, no teams                 |
| **Pro**        | Up to 10     | Team access, permissions             |
| **Enterprise** | Custom       | Advanced analytics, priority support |

### 3.2 Plan Rules

- Personal plan **cannot create teams**
- Pro plan limited to **10 team members**
- Enterprise plan has **no hard limits**
- Plan validity tracked via `membership_start` and `membership_end`

## 4. Core Functional Requirements

### 4.1 Authentication & Authorization

**Requirements**:

- Email + password authentication
- Fake email service (for testing only)
- Fake payment gateway (for testing only)
- Role-based access control (RBAC)

**Tech Decisions**:

- NextAuth or custom auth (TBD)
- Password hashing (bcrypt)
- Session-based auth

## 5. Team Management

### 5.1 Teams

- Each admin can own **one or more teams**
- Team belongs to a single admin (owner)

### 5.2 Team Members

- Invited by admin or authorized manager
- Assigned permissions per module

### 5.3 Permissions Model

| Entity      | Description                                    |
| ----------- | ---------------------------------------------- |
| Modules     | Orders, Inventory, Vendors, Accounts, Payments |
| Permissions | View, Edit                                     |

Team members can have **different permissions per module**.

## 6. Vendor System

### 6.1 Vendor Types

1. **Public Vendor**

   - Created during signup or via marketplace
   - Available to all users

2. **Private Vendor**

   - Added by admin from marketplace
   - Linked to that admin only

3. **Virtual Vendor**

   - Auto-created
   - Represents the admin as a vendor
   - Used for self-sourced products

### 6.2 Vendor Marketplace

**Requirements**:

- Browse public vendors
- Add vendor to admin account
- Store vendor notes and contact info

## 7. Product Management

### 7.1 Product Ownership Model

- All products belong to **admin_id**
- Products may be added by:

  - Admin
  - Team member

### 7.2 Product Attribution

Each product tracks:

- Which admin owns it
- Which vendor sourced it
- Which user added it

This ensures:

- Admin sees full private product list
- Admin can audit team activity

## 8. Orders (eBay Orders)

### 8.1 Order Ownership

- Orders belong to an admin
- Uploaded by admin or team member

### 8.2 Features

- CSV upload of orders
- Auto-calculate:

  - Fees
  - Profit
  - Costs

- Link orders to products via SKU

## 9. Inventory Management

**Requirements**:

- Stock tracking
- Cost tracking
- Vendor assignment
- Import / export inventory via CSV

## 10. Payments

### 10.1 Payment Tracking

- Track vendor payments
- Track subscription payments
- Support fake payment gateway

### 10.2 Payment States

- Pending
- Paid
- Failed
- Refunded

## 11. Dashboard & Analytics

### 11.1 KPIs

- Gross revenue
- Net profit
- Fees
- Inventory value
- Orders volume

### 11.2 Charts

- Time-series revenue
- Product performance
- Vendor cost breakdown

Libraries:

- `recharts`
- `lucide-react`

## 12. File Management

- CSV import/export
- Transaction uploads
- Inventory uploads

Libraries:

- `papaparse`
- `xlsx`

## 13. Database Design (MongoDB)

### 13.1 Storage Strategy

- MongoDB collections mirror logical tables:

  - users
  - teams
  - team_members
  - vendors
  - products
  - ebay_orders
  - payments

### 13.2 Ownership Rules

- Every record scoped by `admin_id`
- Prevents cross-tenant data leakage

## 14. Frontend Architecture

### 14.1 Framework

- Next.js (App Router)
- Turbopack

### 14.2 UI

- `shadcn/ui` (default styles)
- Tailwind CSS (minimal overrides)
- Dark/light mode support

## 15. Backend Architecture

- Next.js API Routes
- MongoDB (Mongoose or native driver)
- Service-layer abstraction for complex logic

## 16. Environment Configuration

### 16.1 `.env.local`

Used for:

- Database connection
- API keys
- External services

### 16.2 `.env.local.example`

```
MONGODB_URI=
FAKE_EMAIL_API_KEY=
FAKE_PAYMENT_API_KEY=
CURRENCY_EXCHANGE_API_KEY=
```

## 17. External APIs

### Currency Exchange

- Required for multi-currency reports
- API key stored in `.env.local`

## 18. Non-Functional Requirements

- Secure tenant isolation
- Scalable data model
- Auditability
- Maintainability
- Modular permissions

## 19. Future Enhancements (Out of Scope for MVP)

- Real email integration
- Real payment gateway
- Multi-marketplace support (Amazon, Shopify)
- AI-based profit insights
- Mobile app

## 20. Success Criteria

- Admin can fully manage business from dashboard
- Team members have restricted access
- Vendors and products are clearly scoped
- Orders and profits are accurately calculated
- System is testable without real integrations



To ensure the development matches your screenshots exactly, you should update **Section 8 (Orders)** and **Section 9 (Inventory)** to define the specific "On-Screen" columns versus the "Hidden/Database" fields.

Here is the revised text for those sections:

---

## 8. Orders (eBay Orders)

The Orders UI is designed for financial clarity. While the database stores full eBay transaction logs, the dashboard UI displays a calculated profit-and-loss view.

### 8.1 On-Screen UI Columns

The following columns must be visible in the table:

* **DATE:** The transaction or order date.
* **ORDER #:** The unique eBay order identifier.
* **SKU:** Product stock keeping unit.
* **ITEM:** The name/title of the product sold.
* **ORDERED QTY:** Number of units sold.
* **TYPE:** Transaction category (e.g., Sale, Refund).
* **GROSS AMOUNT:** Total paid by the buyer.
* **FEES:** eBay/Payment processing fees.
* **SOURCING COST (USD):** The cost to acquire the item from the vendor.
* **SHIPPING COST (USD):** The cost paid to ship the item to the buyer.
* **GROSS PROFIT:** The final calculated profit for that row.

> **Calculation Logic:** > 

---

## 9. Inventory Management

The Inventory UI focuses on asset value and stock levels.

### 9.1 On-Screen UI Columns

The following columns must be visible in the table:

* **SKU:** Unique product identifier.
* **NAME:** Descriptive name of the product.
* **TYPE:** Category of the product.
* **VENDOR:** The linked Public, Private, or Virtual vendor.
* **STOCK:** Current quantity on hand.
* **UNIT COST (USD):** The price paid per single unit.
* **TOTAL COST (USD):** The total value of that specific stock line.
* **ACTIONS:** Buttons for Edit, Delete, or View Details.

> **Calculation Logic:** > 

## 10. Shared UI Elements (Across All Screens)

To support the functionality shown in the screenshots, the following interactive elements are required above the data tables:

1. **Global Filters:**
* **Date Range Pickers:** Start and End date (`dd/mm/yyyy`).
* **Account Selector:** Dropdown to filter by specific eBay accounts.
* **Currency Selector:** Dropdown to toggle reporting currency (Default: USD).


2. **Table Controls:**
* **Search Bar:** Filter rows by SKU, Name, or Order # in real-time.
* **Category Filters:** Dropdowns for "All Types," "Stock Levels," or "Vendors."
* **Action Buttons:** "Upload CSV," "Add Manually," "Export," and "Columns" (to hide/show additional DB fields).

