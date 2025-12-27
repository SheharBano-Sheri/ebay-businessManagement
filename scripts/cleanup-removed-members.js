// Script to clean up User accounts for removed team members
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sheri_db:zhyDJUPTR37OCZ2s@cluster0.nzke1cd.mongodb.net/ebay-bms?retryWrites=true&w=majority';

const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
  role: String,
  adminId: mongoose.Schema.Types.ObjectId,
}, { collection: 'users' });

const TeamMemberSchema = new mongoose.Schema({
  email: String,
  adminId: mongoose.Schema.Types.ObjectId,
  status: String
}, { collection: 'teammembers' });

async function cleanupRemovedMembers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', UserSchema);
    const TeamMember = mongoose.model('TeamMember', TeamMemberSchema);

    // Find all users who are team members (have adminId)
    const teamUsers = await User.find({ 
      adminId: { $exists: true, $ne: null },
      role: 'team_member'
    });

    console.log(`\nFound ${teamUsers.length} team member users`);

    let deletedCount = 0;

    for (const user of teamUsers) {
      // Check if they have a corresponding TeamMember record
      const teamMember = await TeamMember.findOne({ 
        email: user.email,
        adminId: user.adminId
      });

      if (!teamMember) {
        // User exists but TeamMember record doesn't - this is an orphaned account
        console.log(`❌ Orphaned user found: ${user.email} (no TeamMember record)`);
        await User.deleteOne({ _id: user._id });
        console.log(`   ✅ Deleted orphaned user: ${user.email}`);
        deletedCount++;
      } else {
        console.log(`✅ Valid user: ${user.email} (TeamMember status: ${teamMember.status})`);
      }
    }

    console.log(`\n✅ Cleanup complete. Deleted ${deletedCount} orphaned accounts.`);

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupRemovedMembers();
