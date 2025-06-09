const express = require("express");
const router = express.Router();

const {
  createFeedback,
  getAllFeedback,
  deleteFeedback,
} = require("../controllers/feedbackController");
const { userProtect } = require("../middleware/userMiddleware");
const adminProtect = require("../middleware/authMiddleware");


// @route   POST /api/feedback
// @desc    Submit user feedback
router.post("/",  userProtect, createFeedback);

// @route   GET /api/feedback
// @desc    Get all feedback entries (with user info)
router.get("/", adminProtect, getAllFeedback);

// @route   DELETE /api/feedback/:id
// @desc    Delete feedback by ID
router.delete("/:id", adminProtect, deleteFeedback);

module.exports = router;
