const mongoose = require('mongoose');

const personalData = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  fatherName: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
});

const employeeSchema = new mongoose.Schema({
  timsUserName: {
    type: String,
    default: "",
    trim: true
  },
  personalData: {
    type: personalData,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Additional fields specific to Employee can be added here
  position: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  rank: {
    type: String,
    trim: true
  },
  note: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Employee', employeeSchema);
