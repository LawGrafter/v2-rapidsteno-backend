const mongoose = require('mongoose');

const otpTempSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  otp:   { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL: auto-deleted by MongoDB
});

module.exports = mongoose.model('OtpTemp', otpTempSchema);
