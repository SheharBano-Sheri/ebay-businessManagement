import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import SkuMapping from '@/models/SkuMapping';
import Product from '@/models/Product';
import Vendor from '@/models/Vendor';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const adminId = session.user.adminId || session.user.id;
    const { userSku, vendorId, productId, vendorSku } = await request.json();
    
    // Validate required fields
    if (!userSku || !vendorId || !productId || !vendorSku) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify vendor and product exist
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    const product = await Product.findOne({ _id: productId, vendorId });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // Create or update SKU mapping
    const mapping = await SkuMapping.findOneAndUpdate(
      { adminId, userSku, vendorId },
      {
        adminId,
        userSku,
        vendorId,
        productId,
        vendorSku,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    return NextResponse.json({
      success: true,
      mapping,
      message: 'SKU mapping created successfully'
    });
    
  } catch (error) {
    console.error('Error creating SKU mapping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const adminId = session.user.adminId || session.user.id;
    const { searchParams } = new URL(request.url);
    const userSku = searchParams.get('userSku');
    const vendorId = searchParams.get('vendorId');
    
    if (!userSku || !vendorId) {
      return NextResponse.json(
        { error: 'userSku and vendorId are required' },
        { status: 400 }
      );
    }
    
    // Find SKU mapping
    const mapping = await SkuMapping.findOne({
      adminId,
      userSku,
      vendorId
    }).populate('productId');
    
    if (!mapping) {
      return NextResponse.json(
        { error: 'No mapping found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ mapping });
    
  } catch (error) {
    console.error('Error fetching SKU mapping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const adminId = session.user.adminId || session.user.id;
    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('id');
    
    if (!mappingId) {
      return NextResponse.json(
        { error: 'Mapping ID is required' },
        { status: 400 }
      );
    }
    
    // Delete SKU mapping
    const result = await SkuMapping.findOneAndDelete({
      _id: mappingId,
      adminId
    });
    
    if (!result) {
      return NextResponse.json(
        { error: 'Mapping not found or unauthorized' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'SKU mapping deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting SKU mapping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
