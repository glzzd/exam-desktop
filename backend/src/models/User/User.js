const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const UserHistory = require('./UserHistory');

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

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true,
    minlength: 8
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
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  tokenVersion: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Helper to get nested value
const getNestedValue = (obj, path) => {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
};

// Pre-save: Password Hashing
userSchema.pre('save', async function() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// Pre-save: Prepare History Data
userSchema.pre('save', async function() {
  this.$locals.wasNew = this.isNew;
  this.$locals.changes = [];

  if (!this.isNew) {
    try {
      const original = await this.constructor.findById(this._id).lean();
      if (original) {
        let modifiedPaths = this.modifiedPaths();
        
        // Filter out parent paths if children are modified (e.g., ignore 'personalData' if 'personalData.firstName' exists)
        modifiedPaths = modifiedPaths.filter(path => 
            !modifiedPaths.some(otherPath => otherPath.startsWith(path + '.') && otherPath !== path)
        );

        modifiedPaths.forEach(path => {
          // Skip timestamps unless needed
          if (path === 'updatedAt' || path === 'createdAt') return;

          let oldValue = getNestedValue(original, path);
          let newValue = this.get(path);

          // Simple comparison (ignoring deep object equality for now as paths are usually leaf nodes)
          // For objects/arrays, use JSON stringify comparison
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
             // Handle Password masking
             if (path === 'password') {
                oldValue = '********';
                newValue = '********';
             }

            this.$locals.changes.push({
              field: path,
              oldValue,
              newValue
            });
          }
        });
      }
    } catch (err) {
      console.error('Error fetching original document for history:', err);
    }
  }
});

// Post-save: Write History
userSchema.post('save', async function(doc) {
  try {
    let action = 'UPDATE';
    let changes = doc.$locals.changes || [];
    
    if (doc.$locals.wasNew) {
      action = 'CREATE';
      changes = [{ field: 'all', oldValue: null, newValue: 'İstifadəçi yaradıldı' }];
    }

    // Only save history if there are changes or it's a create action
    if (changes.length > 0 || action === 'CREATE') {
      await UserHistory.create({
        targetUser: doc._id,
        action,
        changes,
        modifiedBy: doc.$locals.modifiedBy || doc.createdBy || null,
        ipAddress: doc.$locals.ipAddress || 'unknown',
        userAgent: doc.$locals.userAgent || 'unknown'
      });
    }
  } catch (err) {
    console.error('History logging failed:', err);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
