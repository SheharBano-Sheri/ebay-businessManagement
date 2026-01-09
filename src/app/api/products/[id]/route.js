import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { checkPermission } from '@/lib/permissions';

export async function PUT(request, { params }) {
  try {
    // Check permission - need 'edit' for PUT
    const { authorized, user, error } = await checkPermission('inventory', 'edit');
    
    if (!authorized) {
      return NextResponse.json({ error: error || 'Insufficient permissions to update products' }, { status: 403 });
    }
    
    const session = await getServerSession(authOptions);

    await connectDB();

    const { id } = params;
    const body = await request.json();
    const { country, sku, name, description, type, vendorId, stock, unitCost, currency, listingUrl } = body;

    if (!sku || !name || !vendorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For regular users (owner), adminId is their own ID
    // For team members, adminId is their admin's ID
    // For public vendors, they use their own ID
    const adminId = session.user.adminId || session.user.id;

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
    // Check permission - need 'edit' for DELETE
    const { authorized, user, error } = await checkPermission('inventory', 'edit');
    
    if (!authorized) {
      return NextResponse.json({ error: error || 'Insufficient permissions to delete products' }, { status: 403 });
    }
    
    const session = await getServerSession(authOptions);

    await connectDB();

    const { id } = params;
    
    // For regular users (owner), adminId is their own ID
    // For team members, adminId is their admin's ID
    // For public vendors, they use their own ID
    const adminId = session.user.adminId || session.user.id;

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
