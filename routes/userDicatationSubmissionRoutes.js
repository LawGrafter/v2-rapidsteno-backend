const express = require("express");
const router = express.Router();

const {
  submitDictation,
  updateUserSubmission,
  getCompletedDictationSubmissionsByUser,
  deleteUserSubmission,
  getGlobalLeaderboard,
} = require("../controllers/userDictationsubmissionController");

router.post("/", submitDictation);
router.get("/done/:userId", getCompletedDictationSubmissionsByUser);
router.delete("/:userId/:dictationId", deleteUserSubmission);
router.put("/:userId/:dictationId", updateUserSubmission); 
router.get("/leaderboard", getGlobalLeaderboard);


module.exports = router;
