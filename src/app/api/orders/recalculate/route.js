import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import EbayOrder from '@/models/EbayOrder';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const adminId = session.user.adminId;

    // Get all orders for this admin
    const orders = await EbayOrder.find({ adminId });

    console.log(`Found ${orders.length} orders to recalculate for admin ${adminId}`);

    let updated = 0;
    let errors = 0;

    // Recalculate grossProfit for each order
    for (const order of orders) {
      try {
        const newGrossProfit = order.grossAmount - order.fees - order.sourcingCost - order.shippingCost;
        
        if (order.grossProfit !== newGrossProfit) {
          await EbayOrder.findByIdAndUpdate(order._id, { 
            grossProfit: newGrossProfit 
          });
          updated++;
        }
      } catch (error) {
        console.error(`Error updating order ${order._id}:`, error);
        errors++;
      }
    }

    console.log(`Recalculation complete: ${updated} orders updated, ${errors} errors`);

    return NextResponse.json({ 
      message: 'Recalculation complete',
      totalOrders: orders.length,
      updated,
      errors
    }, { status: 200 });

  } catch (error) {
    console.error('Recalculate orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
