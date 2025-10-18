const express = require('express');
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const Service = require('../models/Service');
const User = require('../models/User');
const Payment = require('../models/Payment'); // Add if missing
const VendorEarnings = require('../models/VendorEarnings'); // Add if missing

const router = express.Router();

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all events for logged-in host
router.get('/my-events', verifyToken, async (req, res) => {
  try {
    const events = await Event.find({ 
      hostId: req.userId,
      status: { $ne: 'dropped' } // Exclude dropped events
    })
      .populate('selectedVendors.vendorId', 'name businessName email')
      .sort({ createdAt: -1 });
    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Get dropped events (events that passed without vendor acceptance)
// Get dropped events (events that passed without vendor acceptance)
router.get('/dropped-events', verifyToken, async (req, res) => {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Find events where:
    // 1. Event date has passed
    // 2. Status is dropped OR (status is pending/submitted and no vendors accepted)
    const events = await Event.find({ 
      hostId: req.userId,
      eventDate: { $lt: currentDate },
      status: { $in: ['draft', 'pending', 'submitted', 'dropped'] } // Added 'dropped' here
    })
    .populate('hostId', 'name email')
    .populate('selectedVendors.vendorId', 'name businessName email')
    .populate('selectedVendors.serviceId', 'name category')
    .sort({ eventDate: -1 });

    // Filter events where no vendors accepted
    const droppedEvents = events.filter(event => {
      if (!event.selectedVendors || event.selectedVendors.length === 0) {
        return true; // No vendors booked at all
      }
      
      const hasAccepted = event.selectedVendors.some(v => v.status === 'accepted');
      return !hasAccepted; // No vendors accepted
    });

    // Update their status to 'dropped' if not already
    for (const event of droppedEvents) {
      if (event.status !== 'dropped') {
        event.status = 'dropped';
        await event.save();
      }
    }

    res.json({ 
      success: true,
      count: droppedEvents.length,
      events: droppedEvents 
    });
  } catch (error) {
    console.error('Get dropped events error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});


// Get bookings for vendor
router.get('/bookings', verifyToken, async (req, res) => {
  try {
    const events = await Event.find({
      'selectedVendors.vendorId': req.userId,
      status: { $ne: 'draft' }
    })
    .populate('hostId', 'name email district')
    .sort({ createdAt: -1 });

    // Filter to only show this vendor's bookings
    const bookings = events.map(event => {
      const vendorBooking = event.selectedVendors.find(
        v => v.vendorId._id.toString() === req.userId
      );
      
      return {
        eventId: event._id,
        eventType: event.eventType,
        eventDate: event.eventDate,
        eventTime: event.eventTime,
        guestCount: event.guestCount,
        specialRequests: event.specialRequests,
        host: event.hostId,
        packageName: vendorBooking.packageName,
        price: vendorBooking.price,
        status: vendorBooking.status,
        serviceId: vendorBooking.serviceId,
        createdAt: event.createdAt
      };
    });

    res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new event (draft)
// Create new event (draft)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { eventType, eventName, eventDate, eventTime, venue, guestCount, budget, specialRequests } = req.body;

    // Validate event date is not in the past
    const selectedDate = new Date(eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return res.status(400).json({ 
        success: false,
        message: 'Event date cannot be in the past' 
      });
    }

    const event = new Event({
      hostId: req.userId,
      eventType,
      eventName,
      eventDate,
      eventTime,
      venue,
      guestCount,
      budget,
      specialRequests,
      status: 'draft'
    });

    await event.save();

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add vendors to event
router.put('/:id/vendors', verifyToken, async (req, res) => {
  try {
    const { selectedVendors } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.hostId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    event.selectedVendors = selectedVendors;
    event.totalCost = selectedVendors.reduce((sum, v) => sum + v.price, 0);
    event.status = 'submitted';

    await event.save();

    res.json({
      message: 'Vendors added successfully',
      event
    });
  } catch (error) {
    console.error('Add vendors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update booking status (vendor accepts/rejects)
router.put('/bookings/:eventId/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const vendorIndex = event.selectedVendors.findIndex(
      v => v.vendorId.toString() === req.userId
    );

    if (vendorIndex === -1) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update this vendor's status
    event.selectedVendors[vendorIndex].status = status;

    // Check if all vendors have responded
    const allResponded = event.selectedVendors.every(
      v => v.status === 'accepted' || v.status === 'rejected'
    );

    if (allResponded) {
      // Check if all accepted
      const allAccepted = event.selectedVendors.every(
        v => v.status === 'accepted'
      );

      if (allAccepted) {
        // All vendors accepted - change event status to "confirmed" or "booked"
        event.status = 'confirmed';
      } else {
        // Some rejected - keep as pending or mark as partial
        const anyAccepted = event.selectedVendors.some(
          v => v.status === 'accepted'
        );
        event.status = anyAccepted ? 'pending' : 'cancelled';
      }
    }

    await event.save();

    res.json({
      message: `Booking ${status} successfully`,
      event,
      allVendorsAccepted: event.status === 'confirmed'
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single event by ID (MUST BE BEFORE /:id/vendors route or after all specific routes)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const event = await Event.findOne({ 
      _id: req.params.id, 
      hostId: req.userId 
    })
    .populate('selectedVendors.vendorId', 'name businessName email district');

    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found' 
      });
    }

    res.json({ 
      success: true,
      event 
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Update event
// Update event
// Update event
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const {
      eventName,
      eventDate,
      eventTime,
      venue,
      guestCount,
      budget,
      specialRequests,
      selectedVendors,
      totalCost,
      status
    } = req.body;

    const event = await Event.findOne({ 
      _id: req.params.id, 
      hostId: req.userId 
    });

    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found' 
      });
    }

    // CRITICAL CHECK: If any vendor has accepted, prevent editing
    const hasAcceptedVendors = event.selectedVendors?.some(v => v.status === 'accepted');
    
    if (hasAcceptedVendors) {
      return res.status(403).json({ 
        success: false,
        message: 'Cannot edit event - one or more vendors have already accepted. Please delete and create a new event if needed.',
        hasAcceptedVendors: true
      });
    }

    // Validate event date is not in the past (if updating date)
    if (eventDate) {
      const selectedDate = new Date(eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        return res.status(400).json({ 
          success: false,
          message: 'Event date cannot be in the past' 
        });
      }
    }

    // Update fields if provided
    if (eventName) event.eventName = eventName;
    if (eventDate) event.eventDate = eventDate;
    if (eventTime) event.eventTime = eventTime;
    if (venue) event.venue = venue;
    if (guestCount) event.guestCount = guestCount;
    if (budget !== undefined) event.budget = budget;
    if (specialRequests !== undefined) event.specialRequests = specialRequests;
    if (selectedVendors) event.selectedVendors = selectedVendors;
    if (totalCost !== undefined) event.totalCost = totalCost;
    if (status) event.status = status;

    await event.save();

    res.json({ 
      success: true,
      message: 'Event updated successfully',
      event 
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});
// Delete event
const razorpay = require('../utils/razorpay'); // Add this import at the top

// Delete event with Razorpay refund handling
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const event = await Event.findOne({ 
      _id: req.params.id, 
      hostId: req.userId 
    }).populate('selectedVendors.vendorId', 'name businessName email');

    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found' 
      });
    }

    // Check if any vendors have accepted
    const acceptedVendors = event.selectedVendors?.filter(v => v.status === 'accepted') || [];
    
    if (acceptedVendors.length > 0) {
      // Handle refunds for accepted bookings with payments
      const refundResults = [];
      
      for (const vendor of acceptedVendors) {
        // Find payment for this vendor
        const payment = await Payment.findOne({
          eventId: event._id,
          vendorId: vendor.vendorId._id,
          status: 'completed'
        });

        

           if (payment) {
  // Process refund (skip Razorpay in test mode, just update database)
  try {
    // Update payment status immediately
    payment.status = 'refunded';
    payment.refundAmount = payment.amount;
    payment.refundedAt = new Date();
    payment.refundId = `refund_${Date.now()}`; // Generate a test refund ID
    await payment.save();

    console.log(`✅ Payment ${payment._id} marked as refunded`);

    // Optional: Try Razorpay refund but don't fail if it errors
    try {
      const refund = await razorpay.payments.refund(payment.paymentId, {
        amount: payment.amount * 100
      });
      payment.refundId = refund.id; // Update with real refund ID if successful
      await payment.save();
      console.log(`✅ Razorpay refund successful: ${refund.id}`);
    } catch (razorpayError) {
      console.log(`⚠️ Razorpay refund skipped (test mode):`, razorpayError.message);
      // Continue anyway - database is already updated
    }

            // Update vendor earnings - deduct the amount
            let vendorEarnings = await VendorEarnings.findOne({ 
      vendorId: vendor.vendorId._id 
    });

    if (!vendorEarnings) {
      console.log(`⚠️ No earnings record found for vendor ${vendor.vendorId._id}`);
    } else {
      // Deduct from pending or available balance
      if (vendorEarnings.pendingAmount >= payment.amount) {
        vendorEarnings.pendingAmount -= payment.amount;
      } else if (vendorEarnings.availableBalance >= payment.amount) {
        vendorEarnings.availableBalance -= payment.amount;
      } else {
        // Deduct proportionally if not enough in either
        const remaining = payment.amount - vendorEarnings.pendingAmount;
        vendorEarnings.pendingAmount = 0;
        vendorEarnings.availableBalance = Math.max(0, vendorEarnings.availableBalance - remaining);
      }
      
      vendorEarnings.refundedAmount += payment.amount;
      
      // Add refund transaction
      vendorEarnings.transactions.push({
        eventId: event._id,
        type: 'refund',
        amount: -payment.amount,
        description: `Refund for cancelled event: ${event.eventName || 'Event'}`
      });

      await vendorEarnings.save();
      console.log(`✅ Vendor earnings updated for ${vendor.vendorId._id}`);
    }

    refundResults.push({
      vendorName: vendor.vendorId.businessName || vendor.vendorId.name,
      amount: payment.amount,
      status: 'refunded',
      refundId: payment.refundId
    });
    
  } catch (refundError) {
    console.error('❌ Refund processing error:', refundError);
    refundResults.push({
      vendorName: vendor.vendorId.businessName || vendor.vendorId.name,
      amount: payment.amount,
      status: 'refund_failed',
      error: refundError.message
    });
  }
}
        else {
          // No payment found, but vendor had accepted
          refundResults.push({
            vendorName: vendor.vendorId.businessName || vendor.vendorId.name,
            status: 'no_payment_found'
          });
        }
      }

      // Delete the event
      await Event.findByIdAndDelete(req.params.id);

      res.json({ 
        success: true,
        message: 'Event deleted successfully',
        refunds: refundResults,
        refundMessage: refundResults.length > 0 
          ? `Processed ${refundResults.filter(r => r.status === 'refunded').length} refund(s)` 
          : 'No payments to refund'
      });
    } else {
      // No accepted vendors, just delete
      await Event.findByIdAndDelete(req.params.id);

      res.json({ 
        success: true,
        message: 'Event deleted successfully' 
      });
    }
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during deletion' 
    });
  }
});

module.exports = router;