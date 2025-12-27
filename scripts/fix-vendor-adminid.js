// Run this script to fix existing public vendors and their products
// This adds the master admin's ID to vendors and products that are missing it

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import connectDB from '../src/lib/mongodb.js';
import User from '../src/models/User.js';
import Vendor from '../src/models/Vendor.js';
import Product from '../src/models/Product.js';

async function fixVendorsAndProducts() {
  try {
    await connectDB();
    
    // Find master admin
    const masterAdmin = await User.findOne({ role: 'master_admin' });
    
    if (!masterAdmin) {
      console.error('No master admin found!');
      process.exit(1);
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
    
    for (const vendor of vendorsWithoutAdmin) {
      vendor.adminId = masterAdmin._id;
      await vendor.save();
      console.log(`✓ Updated vendor: ${vendor.name}`);
      
      // Also fix products from this vendor
      const products = await Product.find({ vendorId: vendor._id });
      console.log(`  Found ${products.length} products for this vendor`);
      
      for (const product of products) {
        if (!product.adminId) {
          product.adminId = masterAdmin._id;
          await product.save();
          console.log(`  ✓ Updated product: ${product.name}`);
        }
      }
    }
    
    console.log('\n✅ All vendors and products have been updated!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixVendorsAndProducts();
