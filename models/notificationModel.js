const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Notification type
  type: {
    type: String,
    enum: ['text', 'image'],
    required: true,
    default: 'text',
  },

  // Content fields
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' }, // 1920x1080 image URL for image-type

  // Button config
  buttonText: { type: String, default: '' },
  buttonLink: { type: String, default: '' }, // external URL or internal path like /dashboard
  buttonLinkType: { type: String, enum: ['internal', 'external'], default: 'internal' },

  // Targeting
  targetAudience: {
    type: String,
    enum: ['all', 'paid', 'trial', 'unpaid', 'plan_based', 'expiring_soon', 'individual'],
    default: 'all',
  },
  targetPlanTypes: [{ type: String }], // e.g. ['gold', 'ahc', 'silver'] for plan_based targeting
  expiryDays: { type: Number, default: 0 }, // for expiring_soon targeting: users whose paidUntil is within N days
  targetUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // for individual targeting

  // Tracking
  sentBy: { type: String, default: 'Admin' },
  clickedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // users who clicked the button
  dismissedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // users who dismissed/seen
  totalClicks: { type: Number, default: 0 },

  // Status
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
