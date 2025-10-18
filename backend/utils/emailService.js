const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send verification email
const sendVerificationEmail = async (email, verificationToken) => {
  const verificationLink = `http://localhost:3000/verify-email/${verificationToken}`;

  const mailOptions = {
    from: `"Party Paradise" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Admin Email - Party Paradise',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 10px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Party Paradise</h1>
            <p>Admin Email Verification</p>
          </div>
          <div class="content">
            <h2>Welcome, Admin!</h2>
            <p>Thank you for registering as an admin for Party Paradise.</p>
            <p>Please verify your email address by clicking the button below:</p>
            <center>
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </center>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationLink}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Party Paradise. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email after verification
const sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: `"Party Paradise" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to Party Paradise Admin Panel',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 10px;
          }
          .header {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Email Verified!</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${name}!</h2>
            <p>Your email has been successfully verified.</p>
            <p>You now have full access to the Party Paradise Admin Panel.</p>
            <p><strong>Admin Capabilities:</strong></p>
            <ul>
              <li>View all registered hosts and vendors</li>
              <li>Manage user accounts</li>
              <li>Handle complaints and disputes</li>
              <li>Monitor platform activity</li>
            </ul>
            <p>Thank you for being part of Party Paradise!</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};
// Send password reset email
const sendPasswordResetEmail = async (email, name, resetToken) => {
  const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

  const mailOptions = {
    from: `"Party Paradise" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Request - Party Paradise',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 10px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello, ${name}!</h2>
            <p>You requested to reset your password for Party Paradise.</p>
            <p>Click the button below to create a new password:</p>
            <center>
              <a href="${resetLink}" class="button">Reset Password</a>
            </center>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
            <div class="warning">
              <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Party Paradise. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Send password change confirmation email
const sendPasswordChangeConfirmation = async (email, name) => {
  const mailOptions = {
    from: `"Party Paradise" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Changed Successfully - Party Paradise',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 10px;
          }
          .header {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .alert {
            background: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Changed</h1>
          </div>
          <div class="content">
            <h2>Hello, ${name}!</h2>
            <div class="alert">
              Your password has been changed successfully.
            </div>
            <p>Your Party Paradise account password was recently changed.</p>
            <p>If you made this change, you can safely ignore this email.</p>
            <p><strong>If you didn't make this change:</strong></p>
            <ul>
              <li>Someone may have accessed your account</li>
              <li>Please contact our support team immediately</li>
              <li>Consider enabling additional security measures</li>
            </ul>
            <p>Thank you for keeping your account secure!</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Party Paradise. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Password change confirmation sent successfully to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending password change confirmation:', error);
    return { success: false, error: error.message };
  }
};
module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangeConfirmation
};