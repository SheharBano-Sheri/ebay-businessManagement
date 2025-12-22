import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const adminId = session.user.adminId;

    const products = await Product.find({ adminId })
      .populate('vendorId', 'name vendorType')
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('Get products error:', error);
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

    const { sku, name, description, type, vendorId, stock, unitCost, currency, images } = body;

    if (!sku || !name || !vendorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminId = session.user.adminId;

    const product = await Product.create({
      sku,
      name,
      description,
      type,
      adminId,
      vendorId,
      addedBy: session.user.id,
      stock: stock || 0,
      unitCost: unitCost || 0,
      currency: currency || 'USD',
      images: images || [],
      isActive: true
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
