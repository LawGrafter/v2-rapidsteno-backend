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

    // Build the document
    const doc = new FormattingTestResult({
      user: userId,
      matter: matterId || undefined,
      dictation: dictationId || undefined,
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
    const records = await FormattingTestResult.find()
      .populate('user', 'firstName lastName email')
      .populate('matter', 'title category difficulty')
      .populate('dictation', 'title type')
      .lean();

    const byUser = new Map();

    for (const r of records) {
      const u = r.user || {};
      const userId = u._id ? String(u._id) : 'unknown';
      if (!byUser.has(userId)) {
        byUser.set(userId, {
          userId: u._id || null,
          name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || null,
          email: u.email || null,
          submissions: [],
        });
      }

      // shape each submission for admin list
      byUser.get(userId).submissions.push({
        _id: r._id,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        matter: r.matter || null,
        dictation: r.dictation || null,
        wordsTyped: r.wordsTyped,
        totalWords: r.totalWords,
        markPerMistake: r.markPerMistake,
        totals: {
          wordMistakes: r.wordMistakesCount,
          formattingMistakes: r.formattingMistakesCount,
          punctuationMistakes: r.punctuationMistakesCount,
          totalMistakes: r.totalMistakes,
        },
        marks: {
          deducted: r.marksDeducted,
          awarded: r.marksAwarded,
        },
        formattingMistakes: r.formattingMistakes,
        wordMistakes: r.wordMistakes,
        punctuationMistakes: r.punctuationMistakes,
        formula: r.formula || null,
        notes: r.notes || null,
      });
    }

    const result = Array.from(byUser.values());
    return res.status(200).json({ totalUsers: result.length, users: result });
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
          // Only include non-sensitive user data for public endpoint
          name: `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim(),
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
    console.error('Error fetching public formatting leaderboard:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add new exports
module.exports.getUserFormattingAnalytics = getUserFormattingAnalytics;
module.exports.getAllUsersBestFormattingData = getAllUsersBestFormattingData;
module.exports.getPublicFormattingLeaderboard = getPublicFormattingLeaderboard;
