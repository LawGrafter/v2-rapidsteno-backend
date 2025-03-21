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
  isActive: { type: Boolean, default: true } // New field to enable/disable user
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', UserSchema);
