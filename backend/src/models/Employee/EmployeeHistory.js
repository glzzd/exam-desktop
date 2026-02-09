const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  targetEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  timsUserName: {
    type: String,
    default: "",
    trim: true
  },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE']
  },
  changes: {
    type: Object, // Stores before/after or specific changes
    default: {}
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Usually an admin user performs the action
    default: null
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

module.exports = mongoose.model('EmployeeHistory', historySchema);
