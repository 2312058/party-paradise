const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    required: true
  },
  serviceType: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate reviews
reviewSchema.index({ vendorId: 1, hostId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);