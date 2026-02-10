const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
  // Student Info (Snapshot at the time of exam)
  student: {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    firstName: String,
    lastName: String,
    fatherName: String,
    gender: String,
    structureName: String,
    structureCode: String
  },
  
  // Session Info
  examSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamSession' },
  deskNumber: Number,
  deskLabel: String,
  machineUuid: String,
  macAddress: String,
  ipAddress: String,

  // Global Timing
  startTime: Date,
  endTime: Date,
  totalDurationSeconds: Number,

  // Detailed Results per Exam Type
  examTypes: [{
    examTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamType' },
    examTypeName: String,
    
    // Stats
    totalQuestions: Number,
    correctCount: Number,
    wrongCount: Number,
    emptyCount: Number,
    score: Number, // Could be percentage
    passed: Boolean, // Met minimum requirements
    
    startTime: Date,
    endTime: Date,
    durationSeconds: Number,

    // Question Details
    questions: [{
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
      text: String,
      options: [{
        _id: String, // Original Option ID
        text: String,
        isCorrect: Boolean
      }],
      selectedOptionId: String, // Null if empty
      isCorrect: Boolean, // True if selectedOptionId matches the correct option
      timeSpentSeconds: Number // Time spent on this specific question
    }]
  }]

}, { timestamps: true });

module.exports = mongoose.model('ExamResult', examResultSchema);
