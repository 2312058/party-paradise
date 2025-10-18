const mongoose = require('mongoose');

const vendorEarningsSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0
  },
  availableBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refundedAmount: {
    type: Number,
    default: 0
  },
  withdrawnAmount: {
    type: Number,
    default: 0
  },
  transactions: [{
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    type: {
      type: String,
      enum: ['earning', 'refund', 'withdrawal'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed'
    }
  }],
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    verified: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
vendorEarningsSchema.index({ vendorId: 1 });

// Method to add earning
vendorEarningsSchema.methods.addEarning = async function(eventId, paymentId, amount, description) {
  this.totalEarnings += amount;
  this.pendingAmount += amount;
  
  this.transactions.push({
    eventId,
    paymentId,
    type: 'earning',
    amount,
    description: description || 'Payment received for booking',
    status: 'completed'
  });
  
  return await this.save();
};

// Method to process refund
vendorEarningsSchema.methods.processRefund = async function(eventId, paymentId, amount, description) {
  // Deduct from pending first, then from available
  if (this.pendingAmount >= amount) {
    this.pendingAmount -= amount;
  } else {
    const remainingAmount = amount - this.pendingAmount;
    this.pendingAmount = 0;
    this.availableBalance -= remainingAmount;
  }
  
  this.refundedAmount += amount;
  
  this.transactions.push({
    eventId,
    paymentId,
    type: 'refund',
    amount: -amount,
    description: description || 'Refund for cancelled booking',
    status: 'completed'
  });
  
  return await this.save();
};

// Method to move pending to available (when event is completed)
vendorEarningsSchema.methods.movePendingToAvailable = async function(amount) {
  if (this.pendingAmount >= amount) {
    this.pendingAmount -= amount;
    this.availableBalance += amount;
    return await this.save();
  }
  throw new Error('Insufficient pending amount');
};

// Method to process withdrawal
vendorEarningsSchema.methods.processWithdrawal = async function(amount, description) {
  if (this.availableBalance < amount) {
    throw new Error('Insufficient available balance');
  }
  
  this.availableBalance -= amount;
  this.withdrawnAmount += amount;
  
  this.transactions.push({
    type: 'withdrawal',
    amount: -amount,
    description: description || 'Withdrawal to bank account',
    status: 'pending'
  });
  
  return await this.save();
};

module.exports = mongoose.model('VendorEarnings', vendorEarningsSchema);