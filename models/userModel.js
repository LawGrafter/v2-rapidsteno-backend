const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const PageLogSchema = new mongoose.Schema({
  page: String,
  timeSpent: Number,
  viewCount: { type: Number, default: 1 },
  deviceType: String,
  browser: String,
  os: String,
  userAgent: String,
}, { _id: false });

const DailyActivitySchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  pages: [PageLogSchema],
  totalActiveTime: { type: Number, default: 0 }, // in seconds
  totalPagesViewed: { type: Number, default: 0 },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: [validator.isEmail, 'Invalid email address']
  },
  phone: {
    type: String,
    required: true,
    validate: [validator.isMobilePhone, 'Invalid phone number']
  },
  password: { type: String, required: true, minlength: 6 },
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
  subscriptionType: {
  type: String,
  enum: ['Trial', 'Unpaid', 'Paid'],
  default: 'Trial'
},

subscriptionHistory: [{
  type: { type: String, enum: ['Trial', 'Unpaid', 'Paid'] },
  startDate: Date,
  endDate: Date,
}],

  examCategory: { type: String, enum: ['Court Exams', 'SSC & other exams'], default: 'Other' },
  isRepeatUser: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastActiveDate: { type: Date, default: Date.now },

    trialExpiresAt: { type: Date },
  paidUntil: { type: Date },

 state: {
    type: String,
    default: ""
  },

  otp: { type: String },
otpExpiresAt: { type: Date },
isEmailVerified: { type: Boolean, default: false },
sessionToken: { type: String },
loginCount: { type: Number, default: 0 },
hasSeenGrowthTour: { type: Boolean, default: false },
hasSeenComparisonTour: { type: Boolean, default: false },

seenNotificationIds: {
  type: [String],
  default: [],
},

termConditions: {
  type: Boolean,
  required: true
},
referralCode: {
  type: String,
  default: ''
},
ipAddress: {
  type: String,
},

  activityLogs: [DailyActivitySchema],
  pageViewStats: [{
  page: String,
  count: { type: Number, default: 1 }
}],

}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', UserSchema);
