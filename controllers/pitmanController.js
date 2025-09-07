const PitmanExerciseSubmission = require("../models/PitmanExerciseSubmission");
const PitmanExercise = require("../models/pitmanExercise.model");
const User = require("../models/userModel");
const mongoose = require("mongoose");

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

// ✅ Aggregated stats: per-user, per-exercise attempts, averages, and recent attempts with full user & exercise details
exports.getPitmanExerciseAggregates = async (req, res) => {
  try {
    const { userId, exerciseNo, attemptsLimit } = req.query;

    const match = {};
    if (userId) {
      try {
        match.user = new mongoose.Types.ObjectId(userId);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid userId" });
      }
    }
    if (exerciseNo) {
      const exNo = parseInt(exerciseNo, 10);
      if (Number.isNaN(exNo)) {
        return res.status(400).json({ success: false, message: "exerciseNo must be a number" });
      }
      match.exerciseNo = exNo;
    }

    const limit = attemptsLimit ? Math.max(1, Math.min(100, parseInt(attemptsLimit, 10))) : 10;

    const pipeline = [
      Object.keys(match).length ? { $match: match } : null,
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { user: "$user", exercise: "$exercise", exerciseNo: "$exerciseNo" },
          attempts: { $sum: 1 },
          avgAccuracy: { $avg: "$accuracy" },
          bestAccuracy: { $max: "$accuracy" },
          avgTimeTaken: { $avg: "$timeTaken" },
          avgTotalMistakes: { $avg: "$totalMistakes" },
          avgCapitalMistakes: { $avg: "$capitalMistakes" },
          avgSpellingMistakes: { $avg: "$spellingMistakes" },
          avgPunctuationMistakes: { $avg: "$punctuationMistakes" },
          avgExtraWords: { $avg: "$extraWords" },
          avgMissingWords: { $avg: "$missingWords" },
          avgSpacingMistakes: { $avg: "$spacingMistakes" },
          lastSubmittedAt: { $max: "$submittedAt" },
          attemptsList: {
            $push: {
              accuracy: "$accuracy",
              totalMistakes: "$totalMistakes",
              capitalMistakes: "$capitalMistakes",
              spellingMistakes: "$spellingMistakes",
              punctuationMistakes: "$punctuationMistakes",
              extraWords: "$extraWords",
              missingWords: "$missingWords",
              spacingMistakes: "$spacingMistakes",
              timeTaken: "$timeTaken",
              submittedAt: "$submittedAt",
              createdAt: "$createdAt"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          user: "$_id.user",
          exercise: "$_id.exercise",
          exerciseNo: "$_id.exerciseNo",
          attempts: 1,
          avgAccuracy: { $round: ["$avgAccuracy", 2] },
          bestAccuracy: 1,
          avgTimeTaken: { $round: ["$avgTimeTaken", 2] },
          avgTotalMistakes: { $round: ["$avgTotalMistakes", 2] },
          avgCapitalMistakes: { $round: ["$avgCapitalMistakes", 2] },
          avgSpellingMistakes: { $round: ["$avgSpellingMistakes", 2] },
          avgPunctuationMistakes: { $round: ["$avgPunctuationMistakes", 2] },
          avgExtraWords: { $round: ["$avgExtraWords", 2] },
          avgMissingWords: { $round: ["$avgMissingWords", 2] },
          avgSpacingMistakes: { $round: ["$avgSpacingMistakes", 2] },
          lastSubmittedAt: 1,
          attemptsRecent: { $slice: ["$attemptsList", limit] }
        }
      },
      { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $lookup: { from: "pitmanexercises", localField: "exercise", foreignField: "_id", as: "exercise" } },
      { $unwind: "$exercise" },
      { $sort: { "user.firstName": 1, exerciseNo: 1 } }
    ].filter(Boolean);

    const data = await PitmanExerciseSubmission.aggregate(pipeline);

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("Aggregation Error:", err);
    return res.status(500).json({ success: false, message: "Failed to aggregate submissions", error: err.message });
  }
};
