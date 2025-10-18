const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { verifyToken } = require('../middleware/auth');
// Create new booking
// Create new booking
router.post('/create', verifyToken, async (req, res) => {
  try {
    const {
      eventType,
      eventName,
      eventDate,
      venue,
      guestCount,
      budget,
      services,
      totalCost
    } = req.body;

    // Validation
    if (!eventType || !eventName || !eventDate || !venue || !services || services.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields' 
      });
    }

    // Create booking
    const booking = new Booking({
      hostId: req.userId,
      eventType,
      eventName,
      eventDate,
      venue,
      guestCount,
      budget,
      services,
      totalCost,
      status: 'pending'
    });

    await booking.save();

    // FIXED: Make sure we're returning success: true
    res.status(201).json({ 
      success: true,
      message: 'Booking created successfully',
      booking 
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Get host's bookings
router.get('/my-bookings', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ hostId: req.userId })
      .populate('services.vendorId', 'name businessName')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// Delete booking
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({ 
      _id: req.params.id, 
      hostId: req.userId 
    });

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true,
      message: 'Booking deleted successfully' 
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});
module.exports = router;