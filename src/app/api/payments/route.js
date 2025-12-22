import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const adminId = session.user.adminId;

    const payments = await Payment.find({ adminId })
      .populate('vendorId', 'name vendorType')
      .sort({ paymentDate: -1 });

    return NextResponse.json({ payments }, { status: 200 });
  } catch (error) {
    console.error('Get payments error:', error);
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
      paymentType,
      vendorId,
      amount,
      currency,
      status,
      paymentDate,
      dueDate,
      description,
      paymentMethod,
      transactionId
    } = body;

    if (!paymentType || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminId = session.user.adminId;

    const payment = await Payment.create({
      adminId,
      paymentType,
      vendorId,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      status: status || 'pending',
      paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      description,
      paymentMethod,
      transactionId
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
