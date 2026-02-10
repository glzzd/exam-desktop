const mongoose = require('mongoose');

const examTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  duration: {
    type: Number,
    default: 60, // minutes
    min: 1
  },
  minCorrectAnswers: {
    type: Number,
    default: 0,
    min: 0
  },
  questionCount: {
    type: Number,
    default: 10,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ExamType', examTypeSchema);
