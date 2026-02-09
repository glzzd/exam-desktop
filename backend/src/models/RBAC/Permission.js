const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  module: {
    type: String,
    required: true,
    trim: true
  },
  moduleKey: {
    type: String,
    required: true,
    trim: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  scope: {
    type: String,
    default: 'organization',
    trim: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  ui: {
    menu: String,
    visible: Boolean
  },
  conditions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

const Permission = mongoose.model('Permission', permissionSchema);

module.exports = Permission;
