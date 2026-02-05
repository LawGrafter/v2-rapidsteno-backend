const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  eventType: { 
    type: String, 
    required: true, 
    enum: ['DEVICE_MISMATCH', 'SUSPICIOUS_LOGIN', 'MULTIPLE_DEVICES', 'Simultaneous Login Attempt'] 
  },
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  deviceId: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for retrieving events by user
securityEventSchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
