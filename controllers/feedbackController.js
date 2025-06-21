// const Feedback = require("../models/Feedback");
// const User = require("../models/userModel");

// // POST - Create new feedback
// exports.createFeedback = async (req, res) => {
//   try {
//     const { message, userId } = req.body;

//     if (!message || !userId) {
//       return res.status(400).json({ error: "Message and userId are required." });
//     }

//     const userExists = await User.findById(userId);
//     if (!userExists) {
//       return res.status(404).json({ error: "User not found." });
//     }

//     const feedback = await Feedback.create({ user: userId, message });
//     res.status(201).json({ success: true, feedback });
//   } catch (err) {
//     res.status(500).json({ error: "Something went wrong while submitting feedback." });
//   }
// };

const Feedback = require("../models/Feedback");
const User = require("../models/userModel");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Create transporter using your SMTP credentials from env
const transporter = nodemailer.createTransport({
  service: "gmail", // Works if you're using Google SMTP
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// POST - Create new feedback and email it to admin
exports.createFeedback = async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ error: "Message and userId are required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const feedback = await Feedback.create({ user: userId, message });

    // Email content setup
    const mailOptions = {
      from: `"Rapid Steno Feedback" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Sends to your own email
      subject: "New User Feedback Received",
      html: `
        <h2>New Feedback Submitted</h2>
        <p><strong>User:</strong> ${user.firstName} ${user.lastName}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Phone:</strong> ${user.phone || "Not Provided"}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    res.status(201).json({ success: true, feedback });
  } catch (err) {
    console.error("Feedback submission error:", err);
    res.status(500).json({ error: "Something went wrong while submitting feedback." });
  }
};

// GET - Get all feedback with user info
exports.getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("user", "firstName lastName email phone")
      .sort({ submittedAt: -1 });

    res.json({ success: true, feedbacks });
  } catch (err) {
    res.status(500).json({ error: "Error fetching feedbacks." });
  }
};

// DELETE - Delete feedback by ID
exports.deleteFeedback = async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Feedback deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Error deleting feedback." });
  }
};
