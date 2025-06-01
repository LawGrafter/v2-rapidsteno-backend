const Feedback = require("../models/Feedback");
const User = require("../models/userModel");

// POST - Create new feedback
exports.createFeedback = async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ error: "Message and userId are required." });
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: "User not found." });
    }

    const feedback = await Feedback.create({ user: userId, message });
    res.status(201).json({ success: true, feedback });
  } catch (err) {
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
