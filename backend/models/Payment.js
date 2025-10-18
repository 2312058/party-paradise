const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'card', 'upi', 'netbanking', 'wallet', 'cash'],
    default: 'razorpay'
  },
  paymentId: {
    type: String, // Razorpay payment ID or order ID
    required: true
  },
  orderId: {
    type: String // Razorpay order ID
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'refunded', 'failed'],
    default: 'pending'
  },
  refundId: {
    type: String // Razorpay refund ID if refunded
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundedAt: {
    type: Date
  },
  packageName: {
    type: String
  },
  serviceType: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed // Any additional payment metadata
  }
}, {
  timestamps: true
});

// Index for faster queries
paymentSchema.index({ eventId: 1, vendorId: 1 });
paymentSchema.index({ hostId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);