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
