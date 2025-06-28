const express = require("express");
const router = express.Router();
const { submitPitmanExercise, getUserPitmanSubmissions } = require("../controllers/pitmanController");

router.post("/submit", submitPitmanExercise);
router.get("/submissions/:userId", getUserPitmanSubmissions);

module.exports = router;
