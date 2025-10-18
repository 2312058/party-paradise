const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
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
    required: false  // Changed from true to false
  },
  eventDate: {
    type: Date,
    required: true
  },
  eventTime: {
    type: String
  },
  venue: {
    type: String,
    required: false  // Changed from true to false
  },
  guestCount: {
    type: Number,
    required: true
  },
  budget: {
    type: Number
  },
  specialRequests: {
    type: String
  },
  selectedVendors: [{
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    packageName: String,
    price: Number,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  }],
  totalCost: {
    type: Number,
    default: 0
  },
  status: {
  type: String,
  enum: ['draft', 'pending', 'submitted', 'confirmed', 'cancelled', 'completed', 'dropped'],
  default: 'draft'
}
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);