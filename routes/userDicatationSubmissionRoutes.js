const express = require("express");
const router = express.Router();

const {
  submitDictation,
  updateUserSubmission,
  getCompletedDictationSubmissionsByUser,
  deleteUserSubmission,
  getGlobalLeaderboard,
getDictationSubmissionCounts,
getUserDictationStats,
} = require("../controllers/userDictationsubmissionController");
const { userProtect } = require("../middleware/userMiddleware");
const adminProtect = require("../middleware/authMiddleware");


router.post("/", userProtect, submitDictation);
router.get("/done/:userId", userProtect, getCompletedDictationSubmissionsByUser);
router.delete("/:userId/:dictationId", userProtect, deleteUserSubmission);
router.put("/:userId/:dictationId", userProtect, updateUserSubmission); 
router.get("/leaderboard", userProtect, getGlobalLeaderboard);
router.get("/dictation-submission-counts", adminProtect, getDictationSubmissionCounts);
router.get("/user-dictation-stats", getUserDictationStats);

module.exports = router;
