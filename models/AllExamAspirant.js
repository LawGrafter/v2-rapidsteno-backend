const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const AllExamAspirantSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid email address']
  },
  phone: {
    type: String,
    required: true,
    validate: [validator.isMobilePhone, 'Invalid phone number']
  },
  password: { type: String, required: true, minlength: 6 },
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
  
  state: {
    type: String,
    required: true
  },
  
  examType: { type: String, required: true },
  
  referralCode: {
    type: String,
    default: ''
  },
  
  howDidHearAboutUs: {
    type: String,
    default: ''
  },
  
  examAttempt: {
    type: String,
    required: true
  },

  // Auth fields
  otp: { type: String },
  otpExpiresAt: { type: Date },
  isEmailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastActiveDate: { type: Date, default: Date.now },
  ipAddress: { type: String },
  termConditions: { type: Boolean, required: true },
  sessionToken: { type: String }

}, { timestamps: true });

// Password hashing middleware
AllExamAspirantSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
AllExamAspirantSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('AllExamAspirant', AllExamAspirantSchema);
