const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendVerificationEmail, sendWelcomeEmail } = require('../utils/emailService');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '7d'
  });
};

// Admin Signup (Only one admin allowed)
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if email is the authorized admin email
    if (email.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ 
        success: false,
        message: 'Only the authorized admin email can register as admin' 
      });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ userType: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false,
        message: 'An admin already exists. Only one admin is allowed in the system.' 
      });
    }

    // Check if this email is already registered as host/vendor
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'This email is already registered as a host or vendor' 
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create admin user
    const admin = new User({
      name,
      email: email.toLowerCase(),
      password,
      userType: 'admin',
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });

    await admin.save();

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Admin created but failed to send verification email. Please contact support.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Admin account created! Please check your email to verify your account.',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        userType: admin.userType,
        isEmailVerified: admin.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Admin signup error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during admin registration' 
    });
  }
});

// Verify Email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const admin = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
      userType: 'admin'
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link'
      });
    }

    // Update admin
    admin.isEmailVerified = true;
    admin.emailVerificationToken = undefined;
    admin.emailVerificationExpires = undefined;
    await admin.save();

    // Send welcome email
    await sendWelcomeEmail(admin.email, admin.name);

    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in.'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
});

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin
    const admin = await User.findOne({ 
      email: email.toLowerCase(),
      userType: 'admin'
    });

    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Check if email is verified
    if (!admin.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Generate token
    const token = generateToken(admin._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        userType: admin.userType,
        isEmailVerified: admin.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login' 
    });
  }
});

// Resend Verification Email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    const admin = await User.findOne({ 
      email: email.toLowerCase(),
      userType: 'admin'
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (admin.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    admin.emailVerificationToken = verificationToken;
    admin.emailVerificationExpires = verificationExpires;
    await admin.save();

    // Resend email
    const emailResult = await sendVerificationEmail(admin.email, verificationToken);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;