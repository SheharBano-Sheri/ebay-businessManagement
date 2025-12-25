import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = params;
    const body = await request.json();
    const { country, sku, name, description, type, vendorId, stock, unitCost, currency, listingUrl } = body;

    if (!sku || !name || !vendorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminId = session.user.adminId;

    // Find the product and ensure it belongs to the user's admin
    const product = await Product.findOne({ _id: id, adminId });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update product fields
    product.country = country;
    product.sku = sku;
    product.name = name;
    product.description = description;
    product.type = type;
    product.vendorId = vendorId;
    product.stock = stock || 0;
    product.unitCost = unitCost || 0;
    product.currency = currency || 'USD';
    product.listingUrl = listingUrl;
    product.updatedAt = new Date();

    await product.save();

    return NextResponse.json({ 
      message: 'Product updated successfully',
      product 
    }, { status: 200 });

  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = params;
    const adminId = session.user.adminId;

    // Find the product and ensure it belongs to the user's admin
    const product = await Product.findOne({ _id: id, adminId });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await Product.deleteOne({ _id: id });

    return NextResponse.json({ 
      message: 'Product deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
