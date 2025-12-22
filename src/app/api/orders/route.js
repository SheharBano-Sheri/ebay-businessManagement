import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import EbayOrder from '@/models/EbayOrder';
import Product from '@/models/Product';
import User from '@/models/User';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const adminId = user.adminId || user._id;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const accountId = searchParams.get('account');

    let query = { adminId };

    if (startDate && endDate) {
      query.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (accountId && accountId !== 'all') {
      query.accountId = accountId;
    }

    const orders = await EbayOrder.find(query)
      .populate('productId', 'name type')
      .populate('uploadedBy', 'name email')
      .populate('accountId', 'accountName ebayUsername')
      .sort({ orderDate: -1 });

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();

    const {
      orderNumber,
      orderDate,
      sku,
      itemName,
      orderedQty,
      transactionType,
      grossAmount,
      fees,
      sourcingCost,
      shippingCost,
      currency,
      ebayAccount
    } = body;

    if (!orderNumber || !orderDate || !sku || !itemName || !grossAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminId = session.user.adminId;

    // Try to link to product
    const product = await Product.findOne({ adminId, sku });

    const order = await EbayOrder.create({
      adminId,
      uploadedBy: session.user.id,
      orderNumber,
      orderDate: new Date(orderDate),
      sku,
      productId: product?._id,
      itemName,
      orderedQty: orderedQty || 1,
      transactionType: transactionType || 'Sale',
      grossAmount: parseFloat(grossAmount),
      fees: parseFloat(fees) || 0,
      sourcingCost: parseFloat(sourcingCost) || 0,
      shippingCost: parseFloat(shippingCost) || 0,
      currency: currency || 'USD',
      ebayAccount
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
