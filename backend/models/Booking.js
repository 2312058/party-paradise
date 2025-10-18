const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventType: {
    type: String,
    required: true
  },
  eventName: {
    type: String,
    required: true
  },
  eventDate: {
    type: Date,
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  guestCount: {
    type: Number,
    required: true
  },
  budget: {
    type: Number
  },
  services: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    packageName: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  }],
  totalCost: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);