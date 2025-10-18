const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
  type: String,
  required: function() {
    return !this.googleId; // Password not required if using Google OAuth
  },
  minlength: [6, 'Password must be at least 6 characters long']
},
  userType: {
  type: String,
  required: [true, 'User type is required'],
  enum: {
    values: ['host', 'vendor', 'admin'], // Add 'admin' here
    message: 'User type must be either host, vendor, or admin'
  }
},
 district: {
  type: String,
  required: function() {
    return this.userType !== 'admin'; // District not required for admin
  },
  trim: true
},
  // Vendor-specific fields
  serviceType: {
    type: String,
    required: function() { 
      return this.userType === 'vendor'; 
    },
    trim: true
  },
  businessName: {
    type: String,
    required: function() { 
      return this.userType === 'vendor'; 
    },
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  experience: {
    type: Number,
    default: 0,
    min: [0, 'Experience cannot be negative']
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: [0, 'Review count cannot be negative']
  },
  isActive: {
  type: Boolean,
  default: true
},
// Google OAuth fields
googleId: {
  type: String,
  sparse: true,
  unique: true
},
// Email verification fields
isEmailVerified: {
  type: Boolean,
  default: false
},
emailVerificationToken: {
  type: String
},
emailVerificationExpires: {
  type: Date
},
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Remove password from JSON response
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Index for faster queries
userSchema.index({ email: 1, userType: 1 });
userSchema.index({ district: 1 });
userSchema.index({ serviceType: 1 });

module.exports = mongoose.model('User', userSchema);