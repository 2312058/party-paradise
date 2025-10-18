const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = express.Router();
const { sendVerificationEmail, sendPasswordResetEmail} = require('../utils/emailService');
const sendEmail = require('../utils/sendEmail');
const { sendPasswordChangeConfirmation } = require('../utils/sendEmail');
// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '7d'
  });
};

// Sign up route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, userType, district, serviceType, businessName, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password || !userType || !district) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate vendor-specific fields
    if (userType === 'vendor' && (!serviceType || !businessName)) {
      return res.status(400).json({ message: 'Service type and business name are required for vendors' });
    }

    // Validate userType
    if (userType !== 'host' && userType !== 'vendor') {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    // Validate email format
    // Validate email format - checks for proper structure
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({ message: 'Invalid email format' });
}

// List of common email domains to catch typos
const validDomains = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
  'icloud.com', 'protonmail.com', 'aol.com', 'zoho.com'
];

const domain = email.split('@')[1].toLowerCase();

// Check for common typos
const commonTypos = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'outlok.com': 'outlook.com'
};

if (commonTypos[domain]) {
  return res.status(400).json({ 
    message: `Did you mean @${commonTypos[domain]}? Please check your email.` 
  });
}

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const userData = {
      name,
      email,
      password,
      userType,
      district
    };

    // Add vendor-specific fields
    if (userType === 'vendor') {
      userData.serviceType = serviceType;
      userData.businessName = businessName;
      userData.phone = phone || '';
    }

    const user = new User(userData);
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        district: user.district,
        serviceType: user.serviceType,
        businessName: user.businessName
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup. Please try again.' });
  }
});

// Login route
router.post('/login', async (req, res) => {  // ← Make sure 'async' is here
  try {
    const { email, password, userType } = req.body;

    // Check if user exists
    const user = await User.findOne({ email, userType });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


// Verify token route
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        district: user.district,
        serviceType: user.serviceType,
        businessName: user.businessName
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});
// Google OAuth Login/Signup
router.post('/google', async (req, res) => {
  try {
    const { credential, userType } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const googleEmail = payload.email.toLowerCase();
    const googleId = payload.sub;
    const name = payload.name;

    // For admin, verify email matches authorized admin email
    if (userType === 'admin') {
      if (googleEmail !== process.env.ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: 'Only the authorized admin email can sign in as admin'
        });
      }

      // Check if admin exists
      let admin = await User.findOne({ email: googleEmail, userType: 'admin' });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin account not found. Please sign up first.',
          needsSignup: true
        });
      }

      // Update googleId if not set
      if (!admin.googleId) {
        admin.googleId = googleId;
        await admin.save();
      }

      // Mark as verified
      admin.isEmailVerified = true;
      await admin.save();

      const token = generateToken(admin._id);

      return res.json({
        success: true,
        message: 'Admin login successful',
        token,
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          userType: admin.userType,
          isEmailVerified: admin.isEmailVerified
        }
      });
    }

    // For host/vendor, check if user exists with this email
    let user = await User.findOne({ email: googleEmail, userType });

    if (!user) {
      // User doesn't exist - they need to complete signup
      return res.status(404).json({
        success: false,
        message: `No ${userType} account found with this email. Please sign up first.`,
        needsSignup: true,
        googleData: {
          email: googleEmail,
          name: name,
          googleId: googleId
        }
      });
    }

    // User exists - link Google account if not already linked
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        district: user.district,
        serviceType: user.serviceType,
        businessName: user.businessName
      }
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed'
    });
  }
});
// Forgot Password - Send reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create reset link
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

    // Send email
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - Party Paradise',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Reset Your Password</h2>
          <p>Hello ${user.name},</p>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      padding: 15px 30px;
                      text-decoration: none;
                      border-radius: 8px;
                      display: inline-block;
                      font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
          <p style="color: #e74c3c; margin-top: 20px;">
            <strong>This link will expire in 1 hour.</strong>
          </p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #95a5a6; font-size: 0.9em;">Party Paradise Team</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reset email'
    });
  }
});
// Reset Password - Update password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset link'
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
// Update password (the User model will hash it automatically)
user.password = newPassword;
await user.save();

    // Send confirmation email
   // Send confirmation email
await sendPasswordChangeConfirmation(user.email, user.name);

    res.json({
      success: true,
      message: 'Password reset successfully! Redirecting to login...'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

module.exports = router;