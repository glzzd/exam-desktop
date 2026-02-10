const mongoose = require('mongoose');
const ClientMachine = require('./src/models/ClientMachine');
require('dotenv').config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/electron-test';
    console.log(`Connecting to ${uri}...`);
    await mongoose.connect(uri);
    console.log('MongoDB Connected');
    
    const machines = await ClientMachine.find({});
    console.log(`Total machines: ${machines.length}`);
    
    const deskCounts = {};
    machines.forEach(m => {
      deskCounts[m.deskNumber] = (deskCounts[m.deskNumber] || 0) + 1;
    });
    
    const duplicates = Object.entries(deskCounts).filter(([desk, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log('Duplicates found:', duplicates);
      for (const [desk, count] of duplicates) {
        const dups = machines.filter(m => m.deskNumber == desk);
        console.log(`Desk ${desk} duplicates:`, dups.map(d => ({ id: d._id, uuid: d.uuid, label: d.label })));
        
        // Fix: Delete duplicates, keep the one with oldest creation time or most data?
        // Let's just log for now.
      }
    } else {
      console.log('No duplicate desk numbers found in DB.');
    }
    
    // Check indexes
    const indexes = await ClientMachine.collection.indexes();
    console.log('Indexes:', indexes);

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

connectDB();
