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

// @desc    Get Pitman learning exercises data
// @route   GET /api/pitman/learning
// @access  Protected (User)
exports.getPitmanLearningExercises = async (req, res) => {
  try {
    const { exerciseNo, page = 1, limit = 10 } = req.query;
    
    // Build query filter
    const filter = {};
    if (exerciseNo) {
      const exNo = parseInt(exerciseNo, 10);
      if (Number.isNaN(exNo)) {
        return res.status(400).json({ 
          success: false, 
          message: "exerciseNo must be a valid number" 
        });
      }
      filter.exerciseNo = exNo;
    }
    
    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(1000, parseInt(limit, 10))); // Max 1000 per page
    const skip = (pageNum - 1) * limitNum;
    
    // Get exercises with pagination
    const exercises = await PitmanExercise.find(filter)
      .select('exerciseNo exerciseText imageLink')
      .sort({ exerciseNo: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Get total count for pagination info
    const totalExercises = await PitmanExercise.countDocuments(filter);
    const totalPages = Math.ceil(totalExercises / limitNum);
    
    // Format response data
    const formattedExercises = exercises.map(exercise => ({
      exerciseNo: exercise.exerciseNo,
      content: exercise.exerciseText,
      imageLink: exercise.imageLink
    }));
    
    res.status(200).json({
      success: true,
      data: {
        exercises: formattedExercises,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalExercises,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (err) {
    console.error("Pitman Learning Exercises Error:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch Pitman learning exercises", 
      error: err.message 
    });
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
// NOTE: Split into lightweight $group (no $push) + separate .find() for recent attempts to stay under Atlas free-tier 33MB memory limit
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

    // Step 1: Lightweight aggregation — stats only, NO $push accumulator
    const pipeline = [
      Object.keys(match).length ? { $match: match } : null,
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
        }
      },
      { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $lookup: { from: "pitmanexercises", localField: "exercise", foreignField: "_id", as: "exercise" } },
      { $unwind: "$exercise" },
    ].filter(Boolean);

    const data = await PitmanExerciseSubmission.aggregate(pipeline);

    // Step 2: Fetch recent attempts via a single efficient find() query
    // Get all recent submissions sorted by date, capped at limit * groups (max 5000)
    const recentCap = Math.min(data.length * limit, 5000);
    const recentSubs = await PitmanExerciseSubmission.find(match)
      .sort({ createdAt: -1 })
      .limit(recentCap)
      .select("user exerciseNo accuracy totalMistakes capitalMistakes spellingMistakes punctuationMistakes extraWords missingWords spacingMistakes timeTaken submittedAt createdAt")
      .lean();

    // Step 3: Group recent submissions by user+exerciseNo, keep only N per group
    const recentMap = {};
    recentSubs.forEach(s => {
      const key = `${s.user}_${s.exerciseNo}`;
      if (!recentMap[key]) recentMap[key] = [];
      if (recentMap[key].length < limit) recentMap[key].push(s);
    });

    // Step 4: Merge recent attempts into aggregation results & sort
    data.forEach(row => {
      const key = `${row.user._id || row.user}_${row.exerciseNo}`;
      row.attemptsRecent = recentMap[key] || [];
    });

    data.sort((a, b) => {
      const nameA = (a.user.firstName || '').toLowerCase();
      const nameB = (b.user.firstName || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return (a.exerciseNo || 0) - (b.exerciseNo || 0);
    });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("Aggregation Error:", err);
    return res.status(500).json({ success: false, message: "Failed to aggregate submissions", error: err.message });
  }
};

// Public leaderboard: aggregates all users' Pitman submissions
exports.getPitmanLeaderboard = async (req, res) => {
  try {
    const { exerciseNo } = req.query;

    const match = {};
    if (exerciseNo && exerciseNo !== 'all') {
      const exNo = parseInt(exerciseNo, 10);
      if (!Number.isNaN(exNo)) match.exerciseNo = exNo;
    }

    const pipeline = [
      Object.keys(match).length ? { $match: match } : null,
      {
        $group: {
          _id: "$user",
          totalAttempts: { $sum: 1 },
          avgAccuracy: { $avg: "$accuracy" },
          bestAccuracy: { $max: "$accuracy" },
          avgMistakes: { $avg: "$totalMistakes" },
          exercisesCovered: { $addToSet: "$exerciseNo" },
          lastSubmittedAt: { $max: "$submittedAt" },
        }
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "userInfo" } },
      { $unwind: "$userInfo" },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: { $concat: ["$userInfo.firstName", " ", "$userInfo.lastName"] },
          totalAttempts: 1,
          avgAccuracy: { $round: ["$avgAccuracy", 2] },
          bestAccuracy: 1,
          avgMistakes: { $round: ["$avgMistakes", 2] },
          exercisesCovered: { $size: "$exercisesCovered" },
          lastSubmittedAt: 1,
        }
      },
    ].filter(Boolean);

    const users = await PitmanExerciseSubmission.aggregate(pipeline);
    // Sort in JS to avoid MongoDB memory limit on Atlas free tier
    users.sort((a, b) => (b.bestAccuracy || 0) - (a.bestAccuracy || 0) || (b.avgAccuracy || 0) - (a.avgAccuracy || 0));

    // Also get the distinct exercise numbers for filter dropdown
    const exerciseNumbers = await PitmanExerciseSubmission.distinct("exerciseNo");
    exerciseNumbers.sort((a, b) => a - b);

    return res.status(200).json({
      success: true,
      count: users.length,
      exerciseNumbers,
      users
    });
  } catch (err) {
    console.error("Pitman Leaderboard Error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch leaderboard", error: err.message });
  }
};

module.exports = {
  submitPitmanExercise: exports.submitPitmanExercise,
  getUserPitmanSubmissions: exports.getUserPitmanSubmissions,
  getPitmanExerciseAggregates: exports.getPitmanExerciseAggregates,
  getPitmanLearningExercises: exports.getPitmanLearningExercises,
  getPitmanLeaderboard: exports.getPitmanLeaderboard
};
