const PitmanExerciseSubmission = require("../models/PitmanExerciseSubmission");
const PitmanExercise = require("../models/pitmanExercise.model");
const User = require("../models/userModel");

exports.submitPitmanExercise = async (req, res) => {
  try {
    const {
      userId,
      exerciseNo,
      accuracy,
      totalMistakes,
      capitalMistakes,
      spellingMistakes,
      punctuationMistakes,
      extraWords,
      missingWords,
      spacingMistakes,
      mistakeSummary,
      timeTaken
    } = req.body;

    const user = await User.findById(userId);
    const exercise = await PitmanExercise.findOne({ exerciseNo });

    if (!user || !exercise) {
      return res.status(404).json({ message: "User or Exercise not found" });
    }

    const submission = new PitmanExerciseSubmission({
      user: user._id,
      exercise: exercise._id,
      exerciseNo,
      accuracy,
      totalMistakes,
      capitalMistakes,
      spellingMistakes,
      punctuationMistakes,
      extraWords,
      missingWords,
      spacingMistakes,
      mistakeSummary,
      timeTaken
    });

    await submission.save();

    res.status(201).json({ success: true, message: "Submission saved", data: submission });
  } catch (err) {
    console.error("Pitman Submission Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to save submission", error: err.message });
  }
};


// ✅ New: Get all Pitman submissions for a specific user
exports.getUserPitmanSubmissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const submissions = await PitmanExerciseSubmission.find({ user: userId })
      .populate("exercise", "exerciseNo title")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      userId,
      count: submissions.length,
      data: submissions
    });
  } catch (err) {
    console.error("Fetch Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch submissions", error: err.message });
  }
};
