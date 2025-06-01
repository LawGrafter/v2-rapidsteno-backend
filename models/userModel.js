
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

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
    unique: true,
    validate: [validator.isMobilePhone, 'Invalid phone number']
  },
  password: { type: String, required: true, minlength: 6 },
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
  subscriptionType: { type: String, enum: ['Free', 'Paid'], default: 'Free' },
  examCategory: { type: String, enum: ['Court Exams', 'SSC & other exams'], default: 'Other' },
  isRepeatUser: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastActiveDate: { type: Date, default: Date.now },

  otp: { type: String },
otpExpiresAt: { type: Date },
isEmailVerified: { type: Boolean, default: false },
sessionToken: { type: String },
loginCount: { type: Number, default: 0 },


}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', UserSchema);
