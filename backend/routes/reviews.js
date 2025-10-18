const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Event = require('../models/Event');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// Get vendors to review (for hosts)
router.get('/vendors-to-review', verifyToken, async (req, res) => {
  try {
    // Get all confirmed events for this host
    const events = await Event.find({
      hostId: req.userId,
      status: 'confirmed'
    }).populate('selectedVendors.vendorId', 'name businessName serviceType district');

    // Extract unique vendors
    const vendorsMap = new Map();
    
    for (const event of events) {
      for (const vendor of event.selectedVendors) {
        if (vendor.status === 'accepted' && vendor.vendorId) {
          const vendorId = vendor.vendorId._id.toString();
          
          // Check if already reviewed for this event
          const existingReview = await Review.findOne({
            vendorId: vendorId,
            hostId: req.userId,
            eventId: event._id
          });

          if (!existingReview && !vendorsMap.has(vendorId)) {
            vendorsMap.set(vendorId, {
              vendorId: vendor.vendorId._id,
              name: vendor.vendorId.businessName || vendor.vendorId.name,
              serviceType: vendor.vendorId.serviceType,
              district: vendor.vendorId.district,
              eventId: event._id,
              eventName: event.eventName,
              eventType: event.eventType
            });
          }
        }
      }
    }

    const vendors = Array.from(vendorsMap.values());

    res.json({
      success: true,
      vendors
    });
  } catch (error) {
    console.error('Get vendors to review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Submit a review
router.post('/submit', verifyToken, async (req, res) => {
  try {
    const { vendorId, eventId, rating, review, serviceType } = req.body;

    // Validation
    if (!vendorId || !eventId || !rating || !review) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if event exists and belongs to this host
    const event = await Event.findOne({
      _id: eventId,
      hostId: req.userId
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      vendorId,
      hostId: req.userId,
      eventId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this vendor for this event'
      });
    }

    // Create review
    const newReview = new Review({
      vendorId,
      hostId: req.userId,
      eventId,
      rating,
      review,
      serviceType
    });

    await newReview.save();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review: newReview
    });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get reviews for a vendor
router.get('/vendor-reviews', verifyToken, async (req, res) => {
  try {
    const reviews = await Review.find({ vendorId: req.userId })
      .populate('hostId', 'name district')
      .populate('eventId', 'eventType eventName eventDate')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

    res.json({
      success: true,
      reviews,
      averageRating,
      totalReviews: reviews.length
    });
  } catch (error) {
    console.error('Get vendor reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get reviews for a specific vendor (public)
router.get('/vendor/:vendorId', verifyToken, async (req, res) => {
  try {
    const reviews = await Review.find({ vendorId: req.params.vendorId })
      .populate('hostId', 'name district')
      .populate('eventId', 'eventType eventDate')
      .sort({ createdAt: -1 });

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

    res.json({
      success: true,
      reviews,
      averageRating,
      totalReviews: reviews.length
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;