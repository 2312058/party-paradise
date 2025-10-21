const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
// MongoDB Connection - Works for both local and Docker
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/party-paradise';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB:', MONGODB_URI);
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});
// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/services', require('./routes/services'));
app.use('/api/events', require('./routes/events'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin/auth', require('./routes/adminAuth'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/payments', require('./routes/payments'));
// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Party Paradise API is running!',
    version: '1.0.0',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        verify: 'GET /api/auth/verify'
      },
      users: {
        getProfile: 'GET /api/users/profile',
        updateProfile: 'PUT /api/users/profile',
        deleteProfile: 'DELETE /api/users/profile'
      },
      vendors: {
        getAllVendors: 'GET /api/vendors',
        getVendorById: 'GET /api/vendors/:id'
      },
      services: {
  getMyServices: 'GET /api/services/my-services',
  getService: 'GET /api/services/:id',
  createService: 'POST /api/services',
  updateService: 'PUT /api/services/:id',
  deleteService: 'DELETE /api/services/:id'
},
events: {
  getMyEvents: 'GET /api/events/my-events',
  getBookings: 'GET /api/events/bookings',
  createEvent: 'POST /api/events',
  addVendors: 'PUT /api/events/:id/vendors',
  updateBookingStatus: 'PUT /api/events/bookings/:eventId/status',
  getEvent: 'GET /api/events/:id'
}
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('🚀 ========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🚀 API URL: http://localhost:${PORT}`);
  console.log('🚀 ========================================');
});