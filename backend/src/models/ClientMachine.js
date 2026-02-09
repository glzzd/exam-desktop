const mongoose = require('mongoose');

const clientMachineSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true
  },
  mac: {
    type: String
  },
  hostname: {
    type: String
  },
  deskNumber: {
    type: Number,
    required: true,
    unique: true
  },
  label: {
    type: String, // e.g., "Masa 1"
    required: true
  },
  lastConnected: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('ClientMachine', clientMachineSchema);
