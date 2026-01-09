import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import EbayOrder from '@/models/EbayOrder';
import Product from '@/models/Product';
import Payment from '@/models/Payment';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const accountId = searchParams.get('account');

    const adminId = session.user.adminId;

    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = {
        orderDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    let accountQuery = {};
    if (accountId && accountId !== 'all') {
      accountQuery = { accountId };
    }

    // Get all transactions (orders)
    const transactions = await EbayOrder.find({ adminId, ...dateQuery, ...accountQuery });
    const recentOrders = await EbayOrder.find({ adminId, ...accountQuery })
      .sort({ orderDate: -1 })
      .limit(10)
      .select('orderNumber itemName grossAmount orderDate accountId');
    
    // CONSOLIDATION LOGIC MATCHING REFERENCE IMPLEMENTATION
    // First, find all order numbers that have a 'Claim' transaction
    const claimedOrderNumbers = new Set(
      transactions
        .filter(t => t.transactionType && t.transactionType.trim().toLowerCase() === 'claim')
        .map(t => t.orderNumber)
    );

    // Track standalone fees (insertion fees, etc.) that aren't tied to orders
    let standaloneInsertionFees = 0;
    let standaloneOtherFees = 0;

    // Group transactions by order number
    const orderMap = transactions.reduce((acc, t) => {
      const transactionType = t.transactionType ? t.transactionType.trim().toLowerCase() : '';
      const description = t.description ? t.description.trim().toLowerCase() : '';

      // Handle standalone insertion fees and other fees separately
      // These are not tied to specific orders and should be counted globally
      if (transactionType === 'insertion fee' || transactionType === 'listing fee') {
        // Use fees field if available, otherwise use netAmount or grossAmount
        const feeAmount = Math.abs(t.fees || t.netAmount || t.grossAmount || 0);
        standaloneInsertionFees += feeAmount;
        return acc; // Don't create an order entry for standalone fees
      }
      
      if (transactionType === 'other fee' || description.includes('transaction fee')) {
        const feeAmount = Math.abs(t.netAmount || t.fees || t.grossAmount || 0);
        standaloneOtherFees += feeAmount;
        return acc; // Don't create an order entry for standalone fees
      }

      // Skip transactions without order numbers (after handling standalone fees)
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

      // Financial Calculations
      if (!isClaimed) {
        // For non-claimed orders, perform standard financial aggregation
        if (transactionType === 'order' || transactionType === 'sale') {
          order.grossAmount += t.grossAmount || 0;
          // ONLY accumulate fees from Order transactions
          order.netEffectFees += Math.abs(t.fees || 0);
        }

        // REFUNDS REDUCE REVENUE (add refund amount to fees as cost)
        if (transactionType === 'refund') {
          order.netEffectFees += Math.abs(t.grossAmount || 0);
        }
        
        // SHIPPING LABEL COSTS
        if (transactionType === 'shipping label' || transactionType === 'postage label') {
          order.reportShippingCost += Math.abs(t.grossAmount || 0);
        }
      }

      return acc;
    }, {});

    // Final mapping and claimed order handling
    const consolidatedOrders = Object.values(orderMap).map(order => {
      const isClaimed = claimedOrderNumbers.has(order.orderNumber);

      if (isClaimed) {
        // CLAIMED ORDERS: Fixed fee based on currency
        if (order.currency === 'GBP') {
          order.fees = 0.36;
        } else {
          order.fees = 0;
        }
        order.grossAmount = 0;
        order.shippingCost = 0;
        order.sourcingCost = 0;
      } else {
        // Regular orders: use accumulated fees (positive)
        order.fees = order.netEffectFees;
        order.shippingCost = (order.shippingCost || 0) + order.reportShippingCost;
      }
      
      // Calculate profit (all values are positive now)
      order.grossProfit = order.grossAmount - order.fees - order.sourcingCost - order.shippingCost;
      
      return order;
    });

    // Calculate totals from consolidated orders (all positive numbers)
    const grossRevenue = consolidatedOrders.reduce((sum, order) => sum + order.grossAmount, 0);
    const totalFees = consolidatedOrders.reduce((sum, order) => sum + order.fees, 0) 
                      + standaloneInsertionFees 
                      + standaloneOtherFees; // Add standalone fees
    const totalSourcingCost = consolidatedOrders.reduce((sum, order) => sum + order.sourcingCost, 0);
    const totalShippingCost = consolidatedOrders.reduce((sum, order) => sum + order.shippingCost, 0);
    
    // Net profit = revenue - all costs (simple formula)
    const netProfit = grossRevenue - totalFees - totalSourcingCost - totalShippingCost;
    
    // Total costs for display
    const totalCosts = totalFees + totalSourcingCost + totalShippingCost;
    
    console.log('Analytics Summary:', {
      grossRevenue,
      totalFees,
      standaloneInsertionFees,
      standaloneOtherFees,
      totalSourcingCost,
      totalShippingCost,
      netProfit
    });

    // Get inventory value
    const products = await Product.find({ adminId, isActive: true });
    const inventoryValue = products.reduce((sum, product) => sum + (product.stock * product.unitCost), 0);
    const totalStock = products.reduce((sum, product) => sum + product.stock, 0);

    // Get payment statistics
    const payments = await Payment.find({ adminId });
    const pendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
    const paidPayments = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      grossRevenue,
      netProfit,
      totalFees, // Already positive (includes order fees + standalone insertion fees + other fees)
      totalCosts,
      totalSourcingCost,
      totalShippingCost,
      standaloneInsertionFees, // Separate insertion fee amount for transparency
      standaloneOtherFees, // Other standalone fees
      inventoryValue,
      totalStock,
      ordersCount: consolidatedOrders.length,
      productsCount: products.length,
      pendingPayments,
      paidPayments,
      recentOrders
    }, { status: 200 });

  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
