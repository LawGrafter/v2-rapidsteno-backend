const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deviceId: { type: String, required: true, index: true },
  deviceType: { type: String },
  os: { type: String },
  browser: { type: String },
  ipAddress: { type: String },
  isActive: { type: Boolean, default: true },
  lastActive: { type: Date, default: Date.now },
  token: { type: String }
}, { timestamps: true });

// Index for finding active sessions for a user
userSessionSchema.index({ user: 1, isActive: 1 });
// Index for finding duplicate usage by device
userSessionSchema.index({ deviceId: 1, user: 1 });

module.exports = mongoose.model('UserSession', userSessionSchema);
