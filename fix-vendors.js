const mongoose = require('mongoose');

// MongoDB connection string - update this with your connection string
const MONGODB_URI = 'mongodb+srv://sheri_db:zhyDJUPTR37OCZ2s@cluster0.nzke1cd.mongodb.net/ebay-bms?retryWrites=true&w=majority';

async function fixVendorData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    // Define schemas inline
    const UserSchema = new mongoose.Schema({}, { strict: false });
    const VendorSchema = new mongoose.Schema({}, { strict: false });
    const ProductSchema = new mongoose.Schema({}, { strict: false });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);
    const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

    // Find master admin
    const masterAdmin = await User.findOne({ role: 'master_admin' });
    
    if (!masterAdmin) {
      console.error('❌ No master admin found!');
      process.exit(1);
    }
    
    console.log('✓ Master Admin found:', masterAdmin.email, 'ID:', masterAdmin._id);
    
    // Fix public vendors without adminId
    const vendorsWithoutAdmin = await Vendor.find({
      vendorType: 'public',
      $or: [
        { adminId: null },
        { adminId: { $exists: false } }
      ]
    });
    
    console.log(`\nFound ${vendorsWithoutAdmin.length} public vendors without adminId`);
    
    let fixedVendors = 0;
    let fixedProducts = 0;
    
    for (const vendor of vendorsWithoutAdmin) {
      vendor.adminId = masterAdmin._id;
      await vendor.save();
      fixedVendors++;
      console.log(`✓ Fixed vendor: ${vendor.name} (${vendor.email})`);
      
      // Also fix products from this vendor
      const products = await Product.find({ vendorId: vendor._id });
      
      if (products.length > 0) {
        console.log(`  Found ${products.length} products for this vendor`);
        
        for (const product of products) {
          if (!product.adminId) {
            product.adminId = masterAdmin._id;
            await product.save();
            fixedProducts++;
            console.log(`  ✓ Fixed product: ${product.name}`);
          }
        }
      }
    }
    
    console.log('\n✅ Summary:');
    console.log(`   Fixed ${fixedVendors} vendors`);
    console.log(`   Fixed ${fixedProducts} products`);
    console.log('\nAll data has been updated!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixVendorData();
