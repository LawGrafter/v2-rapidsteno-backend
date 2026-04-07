const FormattingTestResult = require('../models/FormattingTestResult');

// @desc    Create formatting test result
// @route   POST /api/formatting-test/result
// @access  Private (User)
const createFormattingResult = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication error: User information is missing' });
    }

    const userId = req.user.id;

    const {
      matterId,
      dictationId,
      template,
      formattingMistakes,
      wordMistakes,
      punctuationMistakes,
      wordsTyped,
      totalWords,
      markPerMistake,
      wordMistakesCount,
      formattingMistakesCount,
      punctuationMistakesCount,
      totalMistakes,
      marksDeducted,
      marksAwarded,
      formula,
      notes,
      rawPayload,
    } = req.body;

    // Basic validation for required numeric fields
    const requiredNumeric = {
      wordsTyped,
      totalWords,
      markPerMistake,
      wordMistakesCount,
      formattingMistakesCount,
      punctuationMistakesCount,
      totalMistakes,
      marksDeducted,
      marksAwarded,
    };

    for (const [key, val] of Object.entries(requiredNumeric)) {
      if (val === undefined || val === null || Number.isNaN(Number(val))) {
        return res.status(400).json({ message: `Field ${key} is required and must be a number` });
      }
    }

    // Keep only the latest submission per user — delete all previous ones
    await FormattingTestResult.deleteMany({ user: userId });

    // Build the document
    const doc = new FormattingTestResult({
      user: userId,
      matter: matterId || undefined,
      dictation: dictationId || undefined,
      template: template || 'default',
      formattingMistakes: formattingMistakes
        ? {
            total: Number(formattingMistakes.total ?? formattingMistakesCount),
            details: Array.isArray(formattingMistakes.details) ? formattingMistakes.details : [],
          }
        : { total: Number(formattingMistakesCount), details: [] },
      wordMistakes: wordMistakes
        ? {
            total: Number(wordMistakes.total ?? wordMistakesCount),
            details: Array.isArray(wordMistakes.details) ? wordMistakes.details : [],
          }
        : { total: Number(wordMistakesCount), details: [] },
      punctuationMistakes: punctuationMistakes
        ? {
            total: Number(punctuationMistakes.total ?? punctuationMistakesCount),
            details: Array.isArray(punctuationMistakes.details) ? punctuationMistakes.details : [],
          }
        : { total: Number(punctuationMistakesCount), details: [] },
      wordsTyped: Number(wordsTyped),
      totalWords: Number(totalWords),
      markPerMistake: Number(markPerMistake),
      wordMistakesCount: Number(wordMistakesCount),
      formattingMistakesCount: Number(formattingMistakesCount),
      punctuationMistakesCount: Number(punctuationMistakesCount),
      totalMistakes: Number(totalMistakes),
      marksDeducted: Number(marksDeducted),
      marksAwarded: Number(marksAwarded),
      formula: formula || undefined,
      notes: notes || undefined,
      rawPayload: rawPayload || req.body, // keep original for audit/debug unless provided separately
    });

    const saved = await doc.save();
    return res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating formatting test result:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get formatting test results for a user
// @route   GET /api/formatting-test/my-results
// @access  Private (User)
const getMyFormattingResults = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication error: User information is missing' });
    }

    const results = await FormattingTestResult.find({ user: req.user.id })
      .populate('matter', 'title category difficulty')
      .populate('dictation', 'title type');

    return res.status(200).json({ total: results.length, results });
  } catch (error) {
    console.error('Error fetching user formatting results:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin: Get all formatting test results
// @route   GET /api/formatting-test/all
// @access  Private (Admin)
const getAllFormattingResults = async (req, res) => {
  try {
    const results = await FormattingTestResult.find()
      .populate('user', 'firstName lastName email')
      .populate('matter', 'title category difficulty')
      .populate('dictation', 'title type')
      .lean();

    return res.status(200).json({ total: results.length, results });
  } catch (error) {
    console.error('Error fetching all formatting results:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createFormattingResult,
  getMyFormattingResults,
  getAllFormattingResults,
};

// @desc    Admin: Get all formatting test results grouped by user
// @route   GET /api/formatting-test/admin/users
// @access  Private (Admin)
const getFormattingResultsGroupedByUser = async (req, res) => {
  try {
    // Use aggregation to group on the DB side — avoids loading all 12k+ docs into memory.
    // Also exclude rawPayload and details arrays which can be 10-20KB per submission.
    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo',
          pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$user',
          firstName:  { $first: '$userInfo.firstName' },
          lastName:   { $first: '$userInfo.lastName' },
          email:      { $first: '$userInfo.email' },
          submissions: {
            $push: {
              _id:           '$_id',
              template:      '$template',
              createdAt:     '$createdAt',
              wordsTyped:    '$wordsTyped',
              totalWords:    '$totalWords',
              markPerMistake:'$markPerMistake',
              totals: {
                wordMistakes:        '$wordMistakesCount',
                formattingMistakes:  '$formattingMistakesCount',
                punctuationMistakes: '$punctuationMistakesCount',
                totalMistakes:       '$totalMistakes',
              },
              marks: {
                deducted: '$marksDeducted',
                awarded:  '$marksAwarded',
              },
            },
          },
        },
      },
      {
        $project: {
          userId:      '$_id',
          name:        { $trim: { input: { $concat: [{ $ifNull: ['$firstName', ''] }, ' ', { $ifNull: ['$lastName', ''] }] } } },
          email:       1,
          submissions: 1,
        },
      },
    ];

    const grouped = await FormattingTestResult.aggregate(pipeline);

    return res.status(200).json({ totalUsers: grouped.length, users: grouped });
  } catch (error) {
    console.error('Error grouping formatting results by user:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Export appended at end to avoid hoist confusion in this patch context
module.exports.getFormattingResultsGroupedByUser = getFormattingResultsGroupedByUser;

// @desc    Get user's formatting test analytics data
// @route   GET /api/formatting-test/analytics
// @access  Private (User)
const getUserFormattingAnalytics = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication error: User information is missing' });
    }

    const userId = req.user.id;
    
    // Get all formatting test results for the user
    const results = await FormattingTestResult.find({ user: userId })
      .populate('matter', 'title category difficulty')
      .populate('dictation', 'title type')
      .sort({ createdAt: -1 })
      .lean();
    
    if (!results.length) {
      return res.status(200).json({ 
        message: 'No formatting test data found for this user',
        results: [],
        analytics: {
          totalSubmissions: 0,
          averageAccuracy: 0,
          averageMarks: 0,
          bestScore: 0,
          recentScores: []
        }
      });
    }
    
    // Calculate analytics
    const totalSubmissions = results.length;
    const totalMarks = results.reduce((sum, result) => sum + result.marksAwarded, 0);
    const averageMarks = totalMarks / totalSubmissions;
    
    // Calculate accuracy (100 - percentage of mistakes)
    const accuracies = results.map(result => {
      const totalPossibleMistakes = result.totalWords; // Assuming one mistake per word maximum
      const mistakePercentage = (result.totalMistakes / totalPossibleMistakes) * 100;
      return 100 - Math.min(mistakePercentage, 100); // Cap at 0% minimum accuracy
    });
    
    const averageAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / totalSubmissions;
    
    // Get best score
    const bestScore = Math.max(...results.map(r => r.marksAwarded));
    
    // Get recent scores (last 5)
    const recentScores = results.slice(0, 5).map(r => ({
      id: r._id,
      date: r.createdAt,
      score: r.marksAwarded,
      accuracy: 100 - ((r.totalMistakes / r.totalWords) * 100),
      mistakes: {
        formatting: r.formattingMistakesCount,
        word: r.wordMistakesCount,
        punctuation: r.punctuationMistakesCount,
        total: r.totalMistakes
      }
    }));
    
    return res.status(200).json({
      totalSubmissions,
      results,
      analytics: {
        totalSubmissions,
        averageAccuracy,
        averageMarks,
        bestScore,
        recentScores
      }
    });
  } catch (error) {
    console.error('Error fetching user formatting analytics:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get best formatting test data for all users
// @route   GET /api/formatting-test/admin/best-submissions
// @access  Private (Admin)
const getAllUsersBestFormattingData = async (req, res) => {
  try {
    // Get all users with their formatting test results
    const results = await FormattingTestResult.find()
      .populate('user', 'firstName lastName email')
      .lean();
    
    if (!results.length) {
      return res.status(200).json({ 
        message: 'No formatting test data found',
        users: []
      });
    }
    
    // Group by user
    const userMap = new Map();
    
    for (const result of results) {
      if (!result.user || !result.user._id) continue;
      
      const userId = result.user._id.toString();
      
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId: result.user._id,
          name: `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim(),
          email: result.user.email,
          bestSubmission: null,
          highestAccuracy: 0,
          highestMarks: 0
        });
      }
      
      const user = userMap.get(userId);
      
      // Calculate accuracy
      const totalPossibleMistakes = result.totalWords;
      const mistakePercentage = (result.totalMistakes / totalPossibleMistakes) * 100;
      const accuracy = 100 - Math.min(mistakePercentage, 100);
      
      // Update best submission if this one has higher marks
      if (result.marksAwarded > user.highestMarks) {
        user.highestMarks = result.marksAwarded;
        user.bestSubmission = {
          id: result._id,
          date: result.createdAt,
          marksAwarded: result.marksAwarded,
          accuracy,
          mistakes: {
            formatting: result.formattingMistakesCount,
            word: result.wordMistakesCount,
            punctuation: result.punctuationMistakesCount,
            total: result.totalMistakes
          }
        };
      }
      
      // Update highest accuracy if this one is better
      if (accuracy > user.highestAccuracy) {
        user.highestAccuracy = accuracy;
      }
    }
    
    // Convert map to array and sort by highest marks
    const usersArray = Array.from(userMap.values())
      .sort((a, b) => b.highestMarks - a.highestMarks);
    
    return res.status(200).json({
      totalUsers: usersArray.length,
      users: usersArray
    });
  } catch (error) {
    console.error('Error fetching best formatting data for all users:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get public formatting test leaderboard (accessible to all users)
// @route   GET /api/formatting-test/leaderboard
// @access  Public
const getPublicFormattingLeaderboard = async (req, res) => {
  try {
    const pipeline = [
      // Project only the fields we need — strips rawPayload, details arrays, notes, formula etc.
      {
        $project: {
          user: 1,
          template: 1,
          createdAt: 1,
          marksAwarded: 1,
          totalMistakes: 1,
          totalWords: 1,
          wordMistakesCount: 1,
          formattingMistakesCount: 1,
          punctuationMistakesCount: 1,
        },
      },
      // Compute accuracy inline so we can aggregate it
      {
        $addFields: {
          accuracy: {
            $subtract: [
              100,
              { $min: [{ $multiply: [{ $divide: ['$totalMistakes', { $max: ['$totalWords', 1] }] }, 100] }, 100] },
            ],
          },
        },
      },
      // Sort so that within each user the best (highest marks, most recent) doc comes first
      { $sort: { marksAwarded: -1, createdAt: -1 } },
      // Group by user: pick best submission ($first after sort) and track max accuracy
      {
        $group: {
          _id: '$user',
          highestMarks:        { $max: '$marksAwarded' },
          highestAccuracy:     { $max: '$accuracy' },
          bestDate:            { $first: '$createdAt' },
          bestTemplate:        { $first: '$template' },
          bestMarksAwarded:    { $first: '$marksAwarded' },
          bestAccuracy:        { $first: '$accuracy' },
          bestTotalMistakes:   { $first: '$totalMistakes' },
          bestWordMistakes:    { $first: '$wordMistakesCount' },
          bestFormatMistakes:  { $first: '$formattingMistakesCount' },
          bestPunctMistakes:   { $first: '$punctuationMistakesCount' },
        },
      },
      // Join user name (firstName + lastName only — no email on public endpoint)
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
          pipeline: [{ $project: { firstName: 1, lastName: 1 } }],
        },
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      // Final shape
      {
        $project: {
          name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$userInfo.firstName', ''] },
                  ' ',
                  { $ifNull: ['$userInfo.lastName', ''] },
                ],
              },
            },
          },
          highestMarks:    1,
          highestAccuracy: 1,
          bestSubmission: {
            date:        '$bestDate',
            template:    '$bestTemplate',
            marksAwarded:'$bestMarksAwarded',
            accuracy:    '$bestAccuracy',
            mistakes: {
              total:       '$bestTotalMistakes',
              word:        '$bestWordMistakes',
              formatting:  '$bestFormatMistakes',
              punctuation: '$bestPunctMistakes',
            },
          },
        },
      },
      // Sort leaderboard by highest marks desc
      { $sort: { highestMarks: -1, highestAccuracy: -1 } },
    ];

    const usersArray = await FormattingTestResult.aggregate(pipeline);

    return res.status(200).json({
      totalUsers: usersArray.length,
      users: usersArray,
    });
  } catch (error) {
    console.error('Error fetching public formatting leaderboard:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Upload screen recording for a test session
// @route   POST /api/formatting-test/recording/upload
// @access  Private (User)
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const isVercel = !!process.env.VERCEL;
const uploadDir = isVercel
  ? '/tmp/recordings'
  : path.join(__dirname, '../uploads/recordings');
try { if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); } catch (_) {}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = (req.user && req.user._id) ? String(req.user._id) : 'anon';
    cb(null, `rec_${safe}_${Date.now()}.webm`);
  },
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 * 1024 } });
const uploadRecordingMiddleware = upload.single('recording');
const uploadRecording = (req, res) => {
  if (isVercel) return res.status(503).json({ message: 'Recording upload not supported on this deployment. Use localhost backend.' });
  uploadRecordingMiddleware(req, res, (err) => {
    if (err) return res.status(400).json({ message: 'Upload failed', error: err.message });
    if (!req.file) return res.status(400).json({ message: 'No file received' });
    const url = `/uploads/recordings/${req.file.filename}`;
    return res.status(200).json({ url });
  });
};

// @desc    Admin: Get scoring debug logs (rawPayload.debugLog) for recent submissions
// @route   GET /api/formatting-test/admin/debug-logs
// @access  Private (Admin)
const getFormattingDebugLogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const page  = Math.max(parseInt(req.query.page)  || 0, 0);
    const skip  = page * limit;
    const template  = req.query.template  || '';
    const search    = req.query.search    || '';
    const dateFrom  = req.query.dateFrom  || '';
    const dateTo    = req.query.dateTo    || '';

    const pipeline = [];

    // 1. Date / template pre-filter — default to last 90 days to keep sort under 32 MB (Atlas Free Tier limit)
    const preMatch = {};
    if (template) preMatch.template = template;
    if (dateFrom || dateTo) {
      preMatch.createdAt = {};
      if (dateFrom) preMatch.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   preMatch.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    } else {
      // Default: last 90 days — prevents sorting the entire collection in memory
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      preMatch.createdAt = { $gte: ninetyDaysAgo };
    }
    pipeline.push({ $match: preMatch });

    // 2. Project only lightweight fields BEFORE sorting to reduce memory per document
    pipeline.push({
      $project: {
        _id: 1, user: 1, createdAt: 1, template: 1,
        marksAwarded: 1, totalMistakes: 1,
        wordMistakesCount: 1, formattingMistakesCount: 1,
        punctuationMistakesCount: 1, lineBreakMistakesCount: 1,
      },
    });

    // 3. Sort newest-first BEFORE grouping so $first == latest
    pipeline.push({ $sort: { createdAt: -1 } });

    // 4. Keep only the latest submission per user
    pipeline.push({ $group: { _id: '$user', docId: { $first: '$_id' }, createdAt: { $first: '$createdAt' }, template: { $first: '$template' }, marksAwarded: { $first: '$marksAwarded' }, totalMistakes: { $first: '$totalMistakes' }, wordMistakesCount: { $first: '$wordMistakesCount' }, formattingMistakesCount: { $first: '$formattingMistakesCount' }, punctuationMistakesCount: { $first: '$punctuationMistakesCount' }, lineBreakMistakesCount: { $first: '$lineBreakMistakesCount' } } });

    // 5. Join users for name/email display & search
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo',
        pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }],
      },
    });
    pipeline.push({ $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } });

    // 6. Search by user name / email
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'userInfo.firstName': { $regex: search, $options: 'i' } },
            { 'userInfo.lastName':  { $regex: search, $options: 'i' } },
            { 'userInfo.email':     { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // 7. Re-sort after group (group destroys order)
    pipeline.push({ $sort: { createdAt: -1 } });

    // Facet for total + paginated slim results (no heavy rawPayload yet)
    pipeline.push({
      $facet: {
        total: [{ $count: 'count' }],
        results: [
          { $skip: skip },
          { $limit: limit },
        ],
      },
    });

    const [agg] = await FormattingTestResult.aggregate(pipeline);

    // Now fetch the heavy rawPayload only for the paginated result IDs
    const resultDocIds = (agg?.results || []).map(r => r.docId);
    const heavyDocs = resultDocIds.length
      ? await FormattingTestResult.find({ _id: { $in: resultDocIds } }, {
          'rawPayload.debugLog': 1, 'rawPayload.browserInfo': 1,
          'rawPayload.recordingUrl': 1, 'rawPayload.submissionSnapshot': 1,
        }).lean()
      : [];
    const heavyMap = new Map(heavyDocs.map(d => [d._id.toString(), d.rawPayload || {}]));
    const total = agg?.total?.[0]?.count || 0;

    const formatted = (agg?.results || []).map(r => {
      const heavy = heavyMap.get(r.docId?.toString()) || {};
      return {
        _id: r.docId,
        createdAt: r.createdAt,
        template: r.template,
        user: r.userInfo ? {
          name: `${r.userInfo.firstName || ''} ${r.userInfo.lastName || ''}`.trim(),
          email: r.userInfo.email,
        } : null,
        score: {
          marksAwarded: r.marksAwarded, totalMistakes: r.totalMistakes,
          wordMistakes: r.wordMistakesCount, formatMistakes: r.formattingMistakesCount,
          punctuationMistakes: r.punctuationMistakesCount, lineBreakMistakes: r.lineBreakMistakesCount ?? 0,
        },
        debugLog:    heavy.debugLog    || null,
        browserInfo: heavy.browserInfo || null,
        recordingUrl:heavy.recordingUrl|| null,
        submissionSnapshot: heavy.submissionSnapshot || null,
      };
    });

    return res.status(200).json({ total, page, limit, results: formatted });
  } catch (error) {
    console.error('Error fetching formatting debug logs:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add new exports
module.exports.getUserFormattingAnalytics = getUserFormattingAnalytics;
module.exports.getAllUsersBestFormattingData = getAllUsersBestFormattingData;
module.exports.getPublicFormattingLeaderboard = getPublicFormattingLeaderboard;
module.exports.getFormattingDebugLogs = getFormattingDebugLogs;
module.exports.uploadRecording = uploadRecording;
