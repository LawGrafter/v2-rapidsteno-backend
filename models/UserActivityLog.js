const mongoose = require('mongoose');

const userActivityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  country: {
    type: String,
    default: 'Unknown'
  },
  city: {
    type: String,
    default: 'Unknown'
  },
  deviceType: {
    type: String,
    default: 'Unknown' // mobile, tablet, desktop
  },
  browser: {
    type: String,
    default: 'Unknown'
  },
  os: {
    type: String,
    default: 'Unknown'
  },
  userAgent: {
    type: String
  },
  sessionToken: {
    type: String
  },
  method: {
    type: String
  },
  url: {
    type: String
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } }); // User asked for created_at

// Compound index for efficient querying of user activity by date
userActivityLogSchema.index({ user: 1, created_at: -1 });

module.exports = mongoose.model('UserActivityLog', userActivityLogSchema);
