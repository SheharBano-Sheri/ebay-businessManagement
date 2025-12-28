import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import VendorPurchase from '@/models/VendorPurchase';
import Product from '@/models/Product';
import Vendor from '@/models/Vendor';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const adminId = session.user.adminId || session.user.id;
    
    // Parse form data
    const formData = await request.formData();
    const vendorId = formData.get('vendorId');
    const productId = formData.get('productId');
    const quantity = parseInt(formData.get('quantity'));
    const notes = formData.get('notes') || '';

    // --- NEW FIELDS ---
    const Name = formData.get('Name');
    const contactNumber = formData.get('contactNumber');

    if (!Name || !contactNumber) {
        return NextResponse.json({ error: 'Name and Number are required' }, { status: 400 });
    }
    // ------------------
    
    // Validate required fields
    if (!vendorId || !productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify vendor exists and user has access
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    // Verify product exists and belongs to vendor
    const product = await Product.findOne({ _id: productId, vendorId: vendorId });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // Check if product has enough stock
    if (product.stock < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Only ${product.stock} available` },
        { status: 400 }
      );
    }
    
    // Process file uploads
    const paymentProofs = [];
    const shippingLabels = [];
    const packingSlips = [];
    
    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'vendor-purchases');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    // Helper function to save files
    const saveFiles = async (fileKey, targetArray) => {
      const files = formData.getAll(fileKey);
      for (const file of files) {
        if (file && file.size > 0) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          
          // Generate unique filename
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(7);
          const extension = file.name.split('.').pop();
          const filename = `${timestamp}-${randomString}.${extension}`;
          const filepath = join(uploadDir, filename);
          
          // Save file
          await writeFile(filepath, buffer);
          
          targetArray.push({
            filename: filename,
            originalName: file.name,
            path: `/uploads/vendor-purchases/${filename}`,
            uploadedAt: new Date()
          });
        }
      }
    };
    
    // Save all uploaded files
    await saveFiles('paymentProofs', paymentProofs);
    await saveFiles('shippingLabels', shippingLabels);
    await saveFiles('packingSlips', packingSlips);
    
    // Validate that at least one payment proof is uploaded
    if (paymentProofs.length === 0) {
      return NextResponse.json(
        { error: 'At least one payment proof is required' },
        { status: 400 }
      );
    }
    
    // Calculate total cost
    const totalCost = product.unitCost * quantity;
    
    // Create purchase order
    const purchase = await VendorPurchase.create({
      adminId,
      vendorId,
      productId,
      productSnapshot: {
        sku: product.sku,
        name: product.name,
        unitCost: product.unitCost,
        currency: product.currency || 'USD',
      },
      Name,   // Saved here
      contactNumber, // Saved here
      quantity,
      totalCost,
      paymentProofs,
      shippingLabels,
      packingSlips,
      notes,
      status: 'pending',
      createdBy: session.user.id,
    });
    
    return NextResponse.json({
      success: true,
      purchase,
      message: 'Purchase order created successfully'
    });
    
  } catch (error) {
    console.error('Error creating vendor purchase:', error);
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
    const vendorId = searchParams.get('vendorId');
    const status = searchParams.get('status');
    const forVendor = searchParams.get('forVendor'); // New parameter to fetch purchases for vendor
    
    // Build query
    let query = {};
    
    // If forVendor=true and user is a public_vendor, fetch purchases where they are the vendor
    if (forVendor === 'true' && session.user.role === 'public_vendor') {
      // Find the vendor record for this public vendor user
      const Vendor = (await import('@/models/Vendor')).default;
      const vendorRecord = await Vendor.findOne({ userId: session.user.id, vendorType: 'public' });
      
      if (vendorRecord) {
        query.vendorId = vendorRecord._id;
      } else {
        // No vendor record, return empty array
        return NextResponse.json({ purchases: [] });
      }
    } else {
      // Regular admin viewing their own purchases
      query.adminId = adminId;
      
      if (vendorId) {
        query.vendorId = vendorId;
      }
    }
    
    if (status) {
      query.status = status;
    }
    
    // Fetch purchases
    const purchases = await VendorPurchase.find(query)
      .populate('vendorId', 'name email')
      .populate('productId', 'sku name')
      .populate('adminId', 'name email') // Populate buyer info for vendors
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ purchases });
    
  } catch (error) {
    console.error('Error fetching vendor purchases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Configure file upload size limit
export const config = {
  api: {
    bodyParser: false,
  },
};