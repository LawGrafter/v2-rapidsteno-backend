const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Prevent crash if a corporate proxy inserts a self-signed cert in the chain
  tls: {
    rejectUnauthorized: false,
  },
});

module.exports = transporter;
