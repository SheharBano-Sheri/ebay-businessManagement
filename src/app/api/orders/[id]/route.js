import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import EbayOrder from '@/models/EbayOrder';

export async function PATCH(request, context) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await context.params;
    const updates = await request.json();

    // Only allow updating specific fields
    const allowedFields = ['sourcingCost', 'shippingCost', 'fees'];
    const filteredUpdates = {};
    
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    // Get the current order to calculate grossProfit
    const currentOrder = await EbayOrder.findById(id);
    
    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Calculate new grossProfit based on updated values
    const grossAmount = currentOrder.grossAmount;
    const fees = filteredUpdates.fees !== undefined ? filteredUpdates.fees : currentOrder.fees;
    const sourcingCost = filteredUpdates.sourcingCost !== undefined ? filteredUpdates.sourcingCost : currentOrder.sourcingCost;
    const shippingCost = filteredUpdates.shippingCost !== undefined ? filteredUpdates.shippingCost : currentOrder.shippingCost;
    
    filteredUpdates.grossProfit = grossAmount - fees - sourcingCost - shippingCost;

    const order = await EbayOrder.findByIdAndUpdate(
      id,
      filteredUpdates,
      { new: true, runValidators: true }
    );

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order }, { status: 200 });

  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
