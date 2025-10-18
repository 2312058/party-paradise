const express = require('express');
const jwt = require('jsonwebtoken');
const Service = require('../models/Service');
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

// Get all services for logged-in vendor
router.get('/my-services', verifyToken, async (req, res) => {
  try {
    const services = await Service.find({ vendorId: req.userId }).sort({ createdAt: -1 });
    res.json({ services });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Get all services (for hosts to browse)
router.get('/all', verifyToken, async (req, res) => {
  try {
    const services = await Service.find({ isActive: true })
      .populate('vendorId', 'name businessName serviceType district')
      .sort({ createdAt: -1 });
    
    const formattedServices = services.map(service => ({
      _id: service._id,
      vendorId: service.vendorId._id,
      packageName: service.packageName,
      description: service.description,
      price: service.price,
      duration: service.duration,
      features: service.features,
      availableFor: service.availableFor
    }));

    res.json({ services: formattedServices });
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Get single service
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ service });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new service
router.post('/', verifyToken, async (req, res) => {
  try {
    const { packageName, description, price, duration, features, availableFor } = req.body;

    // Verify user is a vendor
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can add services' });
    }

    const service = new Service({
      vendorId: req.userId,
      packageName,
      description,
      price,
      duration,
      features: features || [],
      availableFor: availableFor || []
    });

    await service.save();

    res.status(201).json({
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update service
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check if service belongs to logged-in vendor
    if (service.vendorId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this service' });
    }

    const { packageName, description, price, duration, features, availableFor } = req.body;

    service.packageName = packageName || service.packageName;
    service.description = description || service.description;
    service.price = price !== undefined ? price : service.price;
    service.duration = duration || service.duration;
    service.features = features || service.features;
    service.availableFor = availableFor || service.availableFor;

    await service.save();

    res.json({
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete service
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check if service belongs to logged-in vendor
    if (service.vendorId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this service' });
    }

    await Service.findByIdAndDelete(req.params.id);

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;