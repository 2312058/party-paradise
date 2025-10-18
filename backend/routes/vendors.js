const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

// Get all vendors
router.get('/', verifyToken, async (req, res) => {
  try {
    // Find all users with userType 'vendor' and not deleted
    const vendors = await User.find({ 
      userType: 'vendor', 
      isActive: true,
      
    })
      .select('-password')
      .sort({ createdAt: -1 });

    // Format vendor data
   const formattedVendors = vendors.map(vendor => ({
  _id: vendor._id,  // ADD THIS
  id: vendor._id,    // KEEP THIS
  name: vendor.name,
  email: vendor.email,
  businessName: vendor.businessName,
  serviceType: vendor.serviceType,
  district: vendor.district,
  phone: vendor.phone,
  experience: vendor.experience,
  rating: vendor.rating,
  reviewCount: vendor.reviewCount
}));

    res.json({
      vendors: formattedVendors,
      count: formattedVendors.length
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get vendor by ID
router.get('/vendor/:vendorId', verifyToken, async (req, res) => {
  try {
    const services = await Service.find({ 
      vendorId: req.params.vendorId,
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      services
    });
  } catch (error) {
    console.error('Get vendor services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
const { getNearbyDistricts } = require('../utils/districtProximity');

router.get('/', verifyToken, async (req, res) => {
  try {
    const { district, filterType } = req.query;
    
    let query = { 
      userType: 'vendor', 
      isActive: true
    };

    // Handle district filtering
    if (district) {
      if (filterType === 'nearest') {
        // Get nearby districts
        const nearbyDistricts = getNearbyDistricts(district);
        query.district = { 
          $in: [district, ...nearbyDistricts] 
        };
      } else {
        // Exact district match
        query.district = district;
      }
    }

    const vendors = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    // Sort by proximity if nearest filter is used
    let sortedVendors = vendors;
    if (filterType === 'nearest' && district) {
      sortedVendors = vendors.sort((a, b) => {
        // Same district vendors come first
        if (a.district === district && b.district !== district) return -1;
        if (a.district !== district && b.district === district) return 1;
        return 0;
      });
    }

    const formattedVendors = sortedVendors.map(vendor => ({
      _id: vendor._id,
      id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      businessName: vendor.businessName,
      serviceType: vendor.serviceType,
      district: vendor.district,
      phone: vendor.phone,
      experience: vendor.experience,
      rating: vendor.rating,
      reviewCount: vendor.reviewCount
    }));

    res.json({
      vendors: formattedVendors,
      count: formattedVendors.length
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single vendor by ID (duplicate route - keeping for compatibility)
router.get('/:vendorId', verifyToken, async (req, res) => {
  try {
    const vendor = await User.findOne({ 
      _id: req.params.vendorId,
      userType: 'vendor',
      isDeleted: false  // ADD THIS
    }).select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    res.json({
      success: true,
      vendor
    });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get services for a specific vendor (public view)

module.exports = router;