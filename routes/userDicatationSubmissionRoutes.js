const express = require("express");
const router = express.Router();

const {
  submitDictation,
  updateUserSubmission,
  getCompletedDictationSubmissionsByUser,
  deleteUserSubmission,
  getGlobalLeaderboard,
getDictationSubmissionCounts,
} = require("../controllers/userDictationsubmissionController");
const { userProtect } = require("../middleware/userMiddleware");
const adminProtect = require("../middleware/authMiddleware");


router.post("/", adminProtect, submitDictation);
router.get("/done/:userId", userProtect, getCompletedDictationSubmissionsByUser);
router.delete("/:userId/:dictationId", adminProtect, deleteUserSubmission);
router.put("/:userId/:dictationId", adminProtect, updateUserSubmission); 
router.get("/leaderboard", userProtect, getGlobalLeaderboard);
router.get("/dictation-submission-counts", adminProtect, getDictationSubmissionCounts);


module.exports = router;
