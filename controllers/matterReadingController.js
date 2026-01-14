const asyncHandler = require('express-async-handler');
const MatterReadingSubmission = require('../models/MatterReadingSubmission');
const User = require('../models/userModel');

const submitMatterReading = asyncHandler(async (req, res) => {
  try {
    const {
      userId,
      originalParagraph,
      voiceTranscript,
      accuracy,
      totalMistakes,
      durationSeconds,
      dictationSpeed,
      originalWords,
      spokenWords,
      speakPunctuationMode,
      rating,
      studentSuggestion,
      submissionDate,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const previousCount = await MatterReadingSubmission.countDocuments({ user: userId });
    const totalCountOfUsage = previousCount + 1;

    const submission = new MatterReadingSubmission({
      user: userId,
      originalParagraph,
      voiceTranscript,
      accuracy,
      totalMistakes,
      durationSeconds,
      dictationSpeed,
      originalWords,
      spokenWords,
      speakPunctuationMode,
      rating,
      studentSuggestion,
      submissionDate,
      totalCountOfUsage,
    });

    await submission.save();

    return res.status(201).json({
      message: 'Matter reading submission saved successfully',
      data: submission,
    });
  } catch (error) {
    console.error('MatterReading Submit Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const getAllMatterReadingSubmissions = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const date = req.query.date;

    const filter = {};

    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.submissionDate = { $gte: start, $lt: end };
    }

    const skip = (page - 1) * limit;

    const [total, submissions] = await Promise.all([
      MatterReadingSubmission.countDocuments(filter),
      MatterReadingSubmission.find(filter)
        .populate('user', 'firstName lastName email phone examCategory subscriptionType')
        .sort({ submissionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({
      page,
      limit,
      total,
      submissions,
    });
  } catch (error) {
    console.error('MatterReading Get All Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const getMatterReadingDailyStats = asyncHandler(async (req, res) => {
  try {
    const { from, to } = req.query;

    const match = {};
    if (from || to) {
      const start = from ? new Date(from) : new Date('1970-01-01');
      const end = to ? new Date(to) : new Date();
      end.setHours(23, 59, 59, 999);
      match.submissionDate = { $gte: start, $lte: end };
    }

    const stats = await MatterReadingSubmission.aggregate([
      Object.keys(match).length ? { $match: match } : null,
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$submissionDate' } },
          totalSubmissions: { $sum: 1 },
          users: { $addToSet: '$user' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalSubmissions: 1,
          uniqueUsers: { $size: '$users' },
        },
      },
      { $sort: { date: 1 } },
    ].filter(Boolean));

    return res.status(200).json({
      stats,
    });
  } catch (error) {
    console.error('MatterReading Daily Stats Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = {
  submitMatterReading,
  getAllMatterReadingSubmissions,
  getMatterReadingDailyStats,
};

