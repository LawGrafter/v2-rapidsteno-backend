const express = require("express");
const router = express.Router();
const Payment = require("../models/payment");


// Add new payment
router.post("/", async (req, res) => {
  try {
    const payment = new Payment(req.body);
    await payment.save();


    console.log("✅ New payment created for user:", req.body.userId);


    res.status(201).json({ payment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// Get all payments for a user
router.get("/:userId", async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;