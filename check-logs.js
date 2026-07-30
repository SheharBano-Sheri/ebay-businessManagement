const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://sheri_db:zhyDJUPTR37OCZ2s@cluster0.nzke1cd.mongodb.net/ebay-bms?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  
  const SyncLogSchema = new mongoose.Schema({}, { strict: false });
  const SyncLog = mongoose.models.SyncLog || mongoose.model('SyncLog', SyncLogSchema, 'synclogs');
  
  const logs = await SyncLog.find().sort({ _id: -1 }).limit(5);
  console.log('Latest SyncLogs:');
  logs.forEach(log => {
    console.log(JSON.stringify(log, null, 2));
  });
  
  mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
