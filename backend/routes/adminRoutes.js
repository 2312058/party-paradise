const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const jwt = require('jsonwebtoken');

// Middleware to verify admin
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.userId = decoded.userId;
    
    // Check if user is admin
    User.findById(req.userId).then(user => {
      if (!user || user.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
      }
      next();
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all hosts and vendors
// Get all hosts and vendors (exclude deleted)
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const hosts = await User.find({ userType: 'host' })

      .select('-password')
      .sort({ createdAt: -1 });

    const vendors = await User.find({ userType: 'vendor' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      hosts,
      vendors
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete user (host or vendor)
// Soft delete user (host or vendor)
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.userType === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin user'
      });
    }

    if (user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'User already deleted'
      });
    }

    // Soft delete - mark as deleted instead of removing
   await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `${user.userType} deleted successfully`
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
// Get all events for admin
router.get('/events', verifyAdmin, async (req, res) => {
  try {
    const events = await Event.find()
      .populate('hostId', 'name email district phone')
      .populate('selectedVendors.vendorId', 'name businessName serviceType email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Get all events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get single event details for admin
router.get('/event/:eventId', verifyAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate('hostId', 'name email district phone')
      .populate('selectedVendors.vendorId', 'name businessName serviceType email');

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
    console.error('Get event details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get payments for a specific event (admin view)
router.get('/event-payments/:eventId', verifyAdmin, async (req, res) => {
  try {
    const payments = await Payment.find({
      eventId: req.params.eventId,
      status: 'completed'
    })
    .populate('vendorId', 'name businessName')
    .populate('hostId', 'name email')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('Get event payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
// Get analytics and reports data
router.get('/reports', verifyAdmin, async (req, res) => {
  try {
    // Get total counts
    const totalHosts = await User.countDocuments({ userType: 'host' });
    const totalVendors = await User.countDocuments({ userType: 'vendor' });
    const totalEvents = await Event.countDocuments();

    // Get total revenue from completed payments
    const payments = await Payment.find({ status: 'completed' });
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Events by status
    const eventsByStatus = await Event.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { name: '$_id', value: '$count', _id: 0 } }
    ]);

    // Events by type
    const eventsByType = await Event.aggregate([
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $project: { name: '$_id', count: '$count', _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    // Events by district
    const eventsByDistrict = await Event.aggregate([
      { $group: { _id: '$district', count: { $sum: 1 } } },
      { $project: { name: '$_id', count: '$count', _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Vendors by service type
    const vendorsByService = await User.aggregate([
      { $match: { userType: 'vendor' } },
      { $group: { _id: '$serviceType', count: { $sum: 1 } } },
      { $project: { name: '$_id', value: '$count', _id: 0 } },
      { $sort: { value: -1 } }
    ]);

    // Monthly events trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Event.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          events: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' }
                ]
              }
            ]
          },
          events: 1,
          _id: 0
        }
      }
    ]);

    // Format month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMonthlyTrend = monthlyTrend.map(item => {
      const [year, month] = item.month.split('-');
      return {
        month: `${monthNames[parseInt(month) - 1]} ${year}`,
        events: item.events
      };
    });

    res.json({
      success: true,
      totalHosts,
      totalVendors,
      totalEvents,
      totalRevenue,
      eventsByStatus,
      eventsByType,
      eventsByDistrict,
      vendorsByService,
      monthlyTrend: formattedMonthlyTrend
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
module.exports = router;