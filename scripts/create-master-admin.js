const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

// User Schema
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  accountType: {
    type: String,
    enum: ['user', 'public_vendor'],
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'team_member', 'public_vendor', 'master_admin'],
    default: 'owner'
  },
  membershipPlan: {
    type: String,
    enum: ['personal', 'pro', 'enterprise'],
    default: 'personal'
  },
  membershipStart: {
    type: Date,
    default: Date.now
  },
  membershipEnd: {
    type: Date
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createMasterAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Check if Master Admin already exists
    let existingMasterAdmin = await User.findOne({ 
      email: 'masteradmin@geniebms.local'
    });

    if (existingMasterAdmin) {
      // Update the existing user to ensure they have master_admin role
      existingMasterAdmin.role = 'master_admin';
      existingMasterAdmin.accountType = 'user';
      existingMasterAdmin.membershipPlan = 'enterprise';
      existingMasterAdmin.name = 'MasterAdmin';
      existingMasterAdmin.membershipEnd = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
      existingMasterAdmin.isActive = true;
      
      // Update password if needed
      const hashedPassword = await bcrypt.hash('admin890', 10);
      existingMasterAdmin.password = hashedPassword;
      
      await existingMasterAdmin.save();
      
      console.log('✓ Master Admin account updated successfully!');
      console.log('\nCredentials:');
      console.log('  Email: masteradmin@geniebms.local');
      console.log('  Username: MasterAdmin');
      console.log('  Password: admin890');
      console.log('  Role: master_admin');
      console.log('  Membership: enterprise');
      console.log('\n✓ Please sign out and sign in again to refresh your session!');
      console.log('✓ Then visit: http://localhost:3000/dashboard');
      await mongoose.connection.close();
      return;
    }

    // Create Master Admin
    const hashedPassword = await bcrypt.hash('admin890', 10);
    
    const masterAdmin = await User.create({
      email: 'masteradmin@geniebms.local',
      password: hashedPassword,
      name: 'MasterAdmin',
      accountType: 'user',
      role: 'master_admin',
      membershipPlan: 'enterprise',
      membershipStart: new Date(),
      membershipEnd: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
      isActive: true
    });

    console.log('✓ Master Admin created successfully!');
    console.log('\nCredentials:');
    console.log('  Email: masteradmin@geniebms.local');
    console.log('  Username: MasterAdmin');
    console.log('  Password: admin890');
    console.log('\n✓ You can now sign in at: http://localhost:3000/auth/signin');

    await mongoose.connection.close();
  } catch (error) {
    console.error('✗ Error creating Master Admin:', error.message);
    process.exit(1);
  }
}

createMasterAdmin();
