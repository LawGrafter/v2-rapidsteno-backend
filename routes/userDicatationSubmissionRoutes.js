// const express = require("express");
// const router = express.Router();
// const { submitDictation } = require("../controllers/userDictationsubmissionController");

// // @route   POST /api/submissions
// // @desc    Submit dictation results
// router.post("/", submitDictation);

// module.exports = router;


const express = require("express");
const router = express.Router();

const {
  submitDictation,
  getCompletedDictationSubmissionsByUser,
  deleteUserSubmission,
} = require("../controllers/userDictationsubmissionController");

// @route   POST /api/submissions
// @desc    Submit dictation results
router.post("/", submitDictation);

// @route   GET /api/submissions/done/:userId
// @desc    Get all dictation IDs completed by a user
router.get("/done/:userId", getCompletedDictationSubmissionsByUser);

// @route   DELETE /api/submissions/:userId/:dictationId
// @desc    Delete a user's submission so they can retake
router.delete("/:userId/:dictationId", deleteUserSubmission);

module.exports = router;
