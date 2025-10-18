const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: `Party Paradise <${process.env.EMAIL_USER}>`,
    to: options.to || options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  await transporter.sendMail(mailOptions);
};

// Function to send password change confirmation
const sendPasswordChangeConfirmation = async (email, name) => {
  await sendEmail({
    to: email,
    subject: 'Password Changed Successfully - Party Paradise',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Password Changed</h2>
        <p>Hello ${name},</p>
        <p>Your password has been changed successfully.</p>
        <p>If you didn't make this change, please contact us immediately.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #95a5a6; font-size: 0.9em;">Party Paradise Team</p>
      </div>
    `
  });
};

module.exports = sendEmail;
module.exports.sendPasswordChangeConfirmation = sendPasswordChangeConfirmation;