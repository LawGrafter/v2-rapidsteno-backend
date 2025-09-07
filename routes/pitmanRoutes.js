const express = require("express");
const router = express.Router();
const { submitPitmanExercise, getUserPitmanSubmissions, getPitmanExerciseAggregates } = require("../controllers/pitmanController");

router.post("/submit", submitPitmanExercise);
router.get("/submissions/:userId", getUserPitmanSubmissions);
router.get("/aggregates", getPitmanExerciseAggregates);

module.exports = router;
