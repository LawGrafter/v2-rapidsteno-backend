const express = require("express");
const router = express.Router();
const { submitPitmanExercise, getUserPitmanSubmissions, getPitmanExerciseAggregates, getPitmanLearningExercises, getPitmanLeaderboard } = require("../controllers/pitmanController");
const { userProtect } = require('../middleware/userMiddleware');

router.post("/submit", submitPitmanExercise);
router.get("/submissions/:userId", getUserPitmanSubmissions);
router.get("/aggregates", getPitmanExerciseAggregates);
router.get("/learning", userProtect, getPitmanLearningExercises);
router.get("/leaderboard", getPitmanLeaderboard);

module.exports = router;
