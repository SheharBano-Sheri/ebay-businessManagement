import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import EbayOrder from "@/models/EbayOrder";
import Product from "@/models/Product";
import Payment from "@/models/Payment";
import Account from "@/models/Account";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const accountId = searchParams.get("account");

    const adminId = session.user.adminId;

    // 1. Fetch existing accounts for this admin, sorted by creation date
    // This ensures that 'existingAccounts[0]' is always the first account created.
    const existingAccounts = await Account.find({ adminId }).sort({
      createdAt: 1,
    });
    const existingAccountIds = existingAccounts.map((acc) =>
      acc._id.toString(),
    );

    // 2. Handle Case: No accounts exist
    // If all accounts are deleted, return zeroed analytics to clear the dashboard.
    if (existingAccountIds.length === 0) {
      return NextResponse.json({
        grossRevenue: 0,
        netProfit: 0,
        totalFees: 0,
        totalCosts: 0,
        totalSourcingCost: 0,
        totalShippingCost: 0,
        inventoryValue: 0,
        totalStock: 0,
        ordersCount: 0,
        productsCount: 0,
        pendingPayments: 0,
        paidPayments: 0,
        recentOrders: [],
        defaultDisplayCurrency: "USD",
      });
    }

    // 3. Determine default display currency
    // If 'All Accounts' is selected, it takes the currency of the top available account.
    // If a specific account is selected, it takes that account's currency.
    let defaultDisplayCurrency = existingAccounts[0].defaultCurrency || "USD";

    if (accountId && accountId !== "all") {
      const selectedAcc = existingAccounts.find(
        (acc) => acc._id.toString() === accountId,
      );
      if (selectedAcc) {
        defaultDisplayCurrency = selectedAcc.defaultCurrency;
      }
    }

    // 4. Build Filter Query
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = {
        orderDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    let accountFilter = {};
    if (accountId && accountId !== "all") {
      accountFilter = { accountId };
    } else {
      // Restrict to only orders belonging to currently existing accounts (removes orphaned data)
      accountFilter = { accountId: { $in: existingAccountIds } };
    }

    // 5. Fetch Data
    const transactions = await EbayOrder.find({
      adminId,
      ...dateQuery,
      ...accountFilter,
    });

    const recentOrders = await EbayOrder.find({ adminId, ...accountFilter })
      .sort({ orderDate: -1 })
      .limit(10)
      .select("orderNumber itemName grossAmount orderDate accountId currency");

    // 6. Consolidation Logic
    const claimedOrderNumbers = new Set(
      transactions
        .filter(
          (t) =>
            t.transactionType &&
            t.transactionType.trim().toLowerCase() === "claim",
        )
        .map((t) => t.orderNumber),
    );

    let standaloneInsertionFees = 0;
    let standaloneOtherFees = 0;

    const orderMap = transactions.reduce((acc, t) => {
      const transactionType = t.transactionType
        ? t.transactionType.trim().toLowerCase()
        : "";
      const description = t.description
        ? t.description.trim().toLowerCase()
        : "";

      // Standalone fees handling
      if (
        transactionType === "insertion fee" ||
        transactionType === "insertion fees" ||
        transactionType === "listing fee"
      ) {
        const feeAmount = Math.abs(t.fees || t.netAmount || t.grossAmount || 0);
        standaloneInsertionFees += feeAmount;
        return acc;
      }

      if (
        transactionType === "other fee" ||
        description.includes("transaction fee")
      ) {
        const feeAmount = Math.abs(t.netAmount || t.fees || t.grossAmount || 0);
        standaloneOtherFees += feeAmount;
        return acc;
      }

      if (!t.orderNumber) return acc;

      const orderNumber = t.orderNumber;
      const isClaimed = claimedOrderNumbers.has(orderNumber);

      if (!acc[orderNumber]) {
        acc[orderNumber] = {
          orderNumber: t.orderNumber,
          currency: t.currency,
          grossAmount: 0,
          netEffectFees: 0,
          reportShippingCost: 0,
          sourcingCost: t.sourcingCost || 0,
          shippingCost: t.shippingCost || 0,
        };
      }

      const order = acc[orderNumber];

      if (!isClaimed) {
        if (transactionType === "order" || transactionType === "sale") {
          order.grossAmount += t.grossAmount || 0;
          order.netEffectFees += Math.abs(t.fees || 0);
        }
        if (transactionType === "refund") {
          order.netEffectFees += Math.abs(t.grossAmount || 0);
        }
        if (
          transactionType === "shipping label" ||
          transactionType === "postage label"
        ) {
          order.reportShippingCost += Math.abs(t.grossAmount || 0);
        }
      }

      return acc;
    }, {});

    const consolidatedOrders = Object.values(orderMap).map((order) => {
      const isClaimed = claimedOrderNumbers.has(order.orderNumber);

      if (isClaimed) {
        order.fees = order.currency === "GBP" ? 0.36 : 0;
        order.grossAmount = 0;
        order.shippingCost = 0;
        order.sourcingCost = 0;
      } else {
        order.fees = order.netEffectFees;
        order.shippingCost =
          (order.shippingCost || 0) + order.reportShippingCost;
      }

      order.grossProfit =
        order.grossAmount -
        order.fees -
        order.sourcingCost -
        order.shippingCost;
      return order;
    });

    // 7. Calculate Totals
    const grossRevenue = consolidatedOrders.reduce(
      (sum, order) => sum + order.grossAmount,
      0,
    );
    const totalFees =
      consolidatedOrders.reduce((sum, order) => sum + order.fees, 0) +
      standaloneInsertionFees +
      standaloneOtherFees;
    const totalSourcingCost = consolidatedOrders.reduce(
      (sum, order) => sum + order.sourcingCost,
      0,
    );
    const totalShippingCost = consolidatedOrders.reduce(
      (sum, order) => sum + order.shippingCost,
      0,
    );

    const netProfit =
      grossRevenue - totalFees - totalSourcingCost - totalShippingCost;
    const totalCosts = totalFees + totalSourcingCost + totalShippingCost;

    // Inventory and Payments
    const products = await Product.find({ adminId, isActive: true });
    const inventoryValue = products.reduce(
      (sum, product) => sum + product.stock * product.unitCost,
      0,
    );
    const totalStock = products.reduce(
      (sum, product) => sum + product.stock,
      0,
    );

    const payments = await Payment.find({ adminId });
    const pendingPayments = payments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + p.amount, 0);
    const paidPayments = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json(
      {
        grossRevenue,
        netProfit,
        totalFees,
        totalCosts,
        totalSourcingCost,
        totalShippingCost,
        standaloneInsertionFees,
        standaloneOtherFees,
        inventoryValue,
        totalStock,
        ordersCount: consolidatedOrders.length,
        productsCount: products.length,
        pendingPayments,
        paidPayments,
        recentOrders,
        defaultDisplayCurrency,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
