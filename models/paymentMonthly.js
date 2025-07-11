// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentId: String,
  paymentRequestId: String,
  status: String,
  amount: Number,
  method: String,
  purpose: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PaymentMonthly', paymentSchema);
