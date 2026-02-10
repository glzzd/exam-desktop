const mongoose = require('mongoose');

const examSessionSchema = new mongoose.Schema({
  // Employee Information
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  
  // Structure Information
  structure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Structure',
    required: true
  },

  // Desk/Machine Information
  deskNumber: {
    type: Number,
    required: true
  },
  deskLabel: {
    type: String,
    required: true
  },
  machineUuid: {
    type: String,
    required: true
  },
  macAddress: {
    type: String
  },
  hostname: {
    type: String
  },
  ipAddress: {
    type: String
  },
  platform: {
    type: String
  },

  // Session Status
  status: {
    type: String,
    enum: ['confirmed', 'started', 'completed', 'cancelled'],
    default: 'confirmed'
  },
  
  confirmedAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },

  // Exam Progress State
  examState: [{
    examTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamType' },
    questions: [{ 
       _id: mongoose.Schema.Types.ObjectId, // Question ID
       text: String,
       options: [{ _id: String, text: String }]
    }],
    answers: { 
      type: Map,
      of: String // questionId -> optionId
    },
    timeSpent: {
      type: Map,
      of: Number // questionId -> seconds
    },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    startTime: Date,
    endTime: Date
  }]

}, { timestamps: true });

// Index for quick lookups
examSessionSchema.index({ machineUuid: 1, status: 1 });
examSessionSchema.index({ employee: 1 });

module.exports = mongoose.model('ExamSession', examSessionSchema);
