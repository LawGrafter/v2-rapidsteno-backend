const express = require("express");
const router = express.Router();
const submissionController = require("../controllers/mcqSubmissionController");
// Submit a full test
router.post("/", submissionController.submitTest);

// Get all submissions sorted by score (leaderboard)
router.get("/", submissionController.getAllSubmissions);

// Get submissions by exam category (rank-wise)
router.get("/category/:category", submissionController.getByCategory);

module.exports = router;
