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
getUserDictationStatsSummary,
getUserDictationAnalysis,
getDictationToppers,
getDictationTopperByDictationId,
getUserMistakeTrends,
getDictationLeaderboard, // ✅ Import new controller
getAllDictationsRanked // ✅ Import global ranked controller
} = require("../controllers/userDictationsubmissionController");
const { userProtect } = require("../middleware/userMiddleware");
const adminProtect = require("../middleware/authMiddleware");


router.post("/", userProtect, submitDictation);
router.get("/done/:userId", userProtect, getCompletedDictationSubmissionsByUser);
router.get("/all-ranked", getAllDictationsRanked); // ✅ All submissions ranked (Global Leaderboard) - Public access
router.delete("/:userId/:dictationId", userProtect, deleteUserSubmission);
router.put("/:userId/:dictationId", userProtect, updateUserSubmission); 
router.get("/leaderboard", userProtect, getGlobalLeaderboard);
// ✅ Specific Dictation Leaderboard
router.get("/leaderboard/:dictationId", userProtect, getDictationLeaderboard);

router.get("/dictation-submission-counts", adminProtect, getDictationSubmissionCounts);
router.get("/user-dictation-stats", getUserDictationStats);

// ✅ New route to get total dictations, avg, highest, and lowest accuracy
router.get("/user-dictation-summary/:userId", userProtect, getUserDictationStatsSummary);

// ✅ New analysis route
router.get("/user-dictation-analysis/:userId", userProtect, getUserDictationAnalysis);
router.get("/dictation-toppers", userProtect, getDictationToppers);
router.get("/dictation-toppers/:dictationId", userProtect, getDictationTopperByDictationId);
router.get("/user-mistake-trends/:userId", userProtect, getUserMistakeTrends);

module.exports = router;
