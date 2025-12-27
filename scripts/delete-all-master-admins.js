/**
 * Script to delete all master admin accounts from the database
 * Run with: node scripts/delete-all-master-admins.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
let MONGODB_URI = null;

for (const line of envLines) {
  if (line.startsWith('MONGODB_URI=')) {
    MONGODB_URI = line.substring('MONGODB_URI='.length).trim();
    break;
  }
}

if (!MONGODB_URI) {
  console.error('✗ MONGODB_URI not found in .env.local');
  process.exit(1);
}

// User Schema (inline to avoid import issues)
const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  accountType: String,
  role: String,
  membershipPlan: String,
  membershipStart: Date,
  membershipEnd: Date,
  isActive: Boolean,
  vendorApprovalStatus: String,
  createdAt: Date,
  updatedAt: Date
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function deleteAllMasterAdmins() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Find all master admins
    const masterAdmins = await User.find({ role: 'master_admin' });
    
    if (masterAdmins.length === 0) {
      console.log('✓ No master admin accounts found in database');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`Found ${masterAdmins.length} master admin account(s):\n`);
    masterAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. Email: ${admin.email}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   ID: ${admin._id}`);
      console.log(`   Created: ${admin.createdAt}\n`);
    });

    // Delete all master admins
    const result = await User.deleteMany({ role: 'master_admin' });
    
    console.log(`✓ Successfully deleted ${result.deletedCount} master admin account(s)\n`);
    console.log('Next step: Run "node scripts/create-master-admin.js" to create a fresh master admin account');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error deleting master admins:', error);
    process.exit(1);
  }
}

deleteAllMasterAdmins();
