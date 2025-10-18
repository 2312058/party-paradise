const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Event = require('../models/Event');
const { verifyToken } = require('../middleware/auth');
const VendorEarnings = require('../models/VendorEarnings');
const razorpay = require('../utils/razorpay');
// Initialize Razorpay

// Create payment order
router.post('/create-order', verifyToken, async (req, res) => {
  try {
    const { eventId, vendorId, amount, packageName } = req.body;

    // Validate event belongs to this host
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

    // Check if payment already exists
    // Check if payment already exists
const existingPayment = await Payment.findOne({
  eventId,
  vendorId,
  hostId: req.userId,
  status: 'completed'
});

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this vendor'
      });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    // Save payment in database
 // Save payment in database
const payment = new Payment({
  eventId,
  hostId: req.userId,
  vendorId,
  amount,
  paymentId: order.id,  // Add this - use order.id as paymentId initially
  orderId: order.id,     // Also save as orderId
  packageName,
  status: 'pending'      // Change from 'created' to 'pending'
});

await payment.save();

    res.json({
      success: true,
      orderId: order.id,
      amount: amount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order'
    });
  }
});

// Verify payment
router.post('/verify-payment', verifyToken, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Verify signature
    const sign = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

   if (razorpaySignature === expectedSign) {
  const payment = await Payment.findOne({ orderId: razorpayOrderId });

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment not found'
    });
  }

  payment.paymentId = razorpayPaymentId;
  payment.status = 'completed';
  await payment.save();

  // ADD THIS - Track vendor earnings
// Track vendor earnings
try {
  console.log('💰 Tracking earnings for vendor:', payment.vendorId);
  
  let vendorEarnings = await VendorEarnings.findOne({ 
    vendorId: payment.vendorId 
  });

  console.log('Existing earnings found?', !!vendorEarnings);

  if (!vendorEarnings) {
    console.log('Creating new vendor earnings document...');
    vendorEarnings = new VendorEarnings({ 
      vendorId: payment.vendorId,
      pendingAmount: 0,
      availableBalance: 0,
      totalEarnings: 0,
      refundedAmount: 0,
      transactions: []
    });
  }

  // Add to pending amount (will be available after event completion)
  vendorEarnings.pendingAmount += payment.amount;
  vendorEarnings.totalEarnings += payment.amount;
  
  // Add transaction record
  vendorEarnings.transactions.push({
    eventId: payment.eventId,
    type: 'earning',
    amount: payment.amount,
    description: `Payment received for ${payment.packageName || 'service'}`,
    paymentId: payment._id
  });

  await vendorEarnings.save();
  console.log('✅ Vendor earnings saved! Total:', vendorEarnings.totalEarnings);
} catch (err) {
  console.error('❌ Error tracking earnings:', err.message);
  console.error('Full error:', err);
}

  res.json({
    success: true,
    message: 'Payment verified successfully',
    payment
  });
}

   else {
      res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
});

// Get payments for an event (host view)
router.get('/event/:eventId', verifyToken, async (req, res) => {
  try {
    const payments = await Payment.find({
      eventId: req.params.eventId,
      hostId: req.userId
    })
    .populate('vendorId', 'name businessName serviceType')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

// Get payments received by vendor
router.get('/vendor-payments', verifyToken, async (req, res) => {
  try {
    const payments = await Payment.find({
  vendorId: req.userId,
  status: 'completed'
})
    .populate('hostId', 'name email district')
    .populate('eventId', 'eventType eventName eventDate')
    .sort({ createdAt: -1 });

    const totalEarnings = payments.reduce((sum, payment) => sum + payment.amount, 0);

    res.json({
      success: true,
      payments,
      totalEarnings
    });
  } catch (error) {
    console.error('Get vendor payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

module.exports = router;