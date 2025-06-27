const mongoose = require("mongoose");


const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  referenceId: { type: String, required: true },
  medium: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["Completed", "Pending", "Failed"], default: "Completed" },
});


module.exports = mongoose.model("Payment", paymentSchema);