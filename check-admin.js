const mongoose = require('mongoose');
const fs = require('fs');

// Read .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const envLines = envFile.split('\n');
envLines.forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
    const [key, ...valueParts] = trimmedLine.split('=');
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      name: String,
      role: String,
      isActive: Boolean,
      membershipPlan: String
    }, { collection: 'users' }));

    const admin = await User.findOne({ email: 'masteradmin@geniebms.local' });
    
    if (admin) {
      console.log('🎉 Master Admin FOUND in database:');
      console.log('   Email:', admin.email);
      console.log('   Name:', admin.name);
      console.log('   Role:', admin.role);
      console.log('   Active:', admin.isActive);
      console.log('   Plan:', admin.membershipPlan);
      console.log('\n✅ You can sign in with:');
      console.log('   Email: masteradmin@geniebms.local');
      console.log('   Password: admin890');
    } else {
      console.log('❌ Master Admin NOT FOUND in database');
      console.log('\n📝 To create Master Admin:');
      console.log('   1. Visit: http://localhost:3001/setup/master-admin');
      console.log('   2. Click "Create Master Admin" button');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

connectDB();
