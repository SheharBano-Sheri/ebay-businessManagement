import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Vendor from '@/models/Vendor';
import Product from '@/models/Product';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Find master admin
    const masterAdmin = await User.findOne({ role: 'master_admin' });
    
    if (!masterAdmin) {
      return NextResponse.json({ error: 'No master admin found' }, { status: 500 });
    }
    
    console.log('Master Admin found:', masterAdmin.email, 'ID:', masterAdmin._id);
    
    // Fix public vendors without adminId
    const vendorsWithoutAdmin = await Vendor.find({
      vendorType: 'public',
      $or: [
        { adminId: null },
        { adminId: { $exists: false } }
      ]
    });
    
    console.log(`Found ${vendorsWithoutAdmin.length} public vendors without adminId`);
    
    let fixedVendors = 0;
    let fixedProducts = 0;
    
    for (const vendor of vendorsWithoutAdmin) {
      vendor.adminId = masterAdmin._id;
      await vendor.save();
      fixedVendors++;
      console.log(`✓ Updated vendor: ${vendor.name}`);
      
      // Also fix products from this vendor
      const products = await Product.find({ vendorId: vendor._id });
      console.log(`  Found ${products.length} products for this vendor`);
      
      for (const product of products) {
        if (!product.adminId) {
          product.adminId = masterAdmin._id;
          await product.save();
          fixedProducts++;
          console.log(`  ✓ Updated product: ${product.name}`);
        }
      }
    }
    
    return NextResponse.json({ 
      message: 'Data fixed successfully',
      fixedVendors,
      fixedProducts
    }, { status: 200 });
  } catch (error) {
    console.error('Error fixing data:', error);
    return NextResponse.json({ 
      error: 'Failed to fix data',
      details: error.message 
    }, { status: 500 });
  }
}
