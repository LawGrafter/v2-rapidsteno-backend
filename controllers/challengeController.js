const Challenge = require('../models/Challenge');
const ChallengeQuestion = require('../models/ChallengeQuestion');
const ChallengeSubmission = require('../models/ChallengeSubmission');
const User = require('../models/userModel');
const csv = require('csv-parser');
const { Readable } = require('stream');

// ===================== USER ENDPOINTS =====================

// GET /active — Get currently active challenge
exports.getActiveChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ isActive: true }).lean();
    if (!challenge) {
      return res.status(200).json(null);
    }
    res.json(challenge);
  } catch (err) {
    console.error('getActiveChallenge error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /progress/:userId — Get user's challenge progress
exports.getChallengeProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const activeChallenge = await Challenge.findOne({ isActive: true }).lean();
    if (!activeChallenge) {
      return res.json({ sections: { formatting: {}, exercise: {}, mock: {} } });
    }

    const submission = await ChallengeSubmission.findOne({
      userId,
      challengeId: activeChallenge._id,
    }).lean();

    if (!submission) {
      return res.json({ sections: { formatting: {}, exercise: {}, mock: {} } });
    }

    res.json({
      sections: submission.sections || { formatting: {}, exercise: {}, mock: {} },
    });
  } catch (err) {
    console.error('getChallengeProgress error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /submit — Submit a challenge section result
exports.submitChallengeSection = async (req, res) => {
  try {
    const { userId, challengeId, section, data } = req.body;

    if (!userId || !challengeId || !section || !data) {
      return res.status(400).json({ message: 'Missing required fields: userId, challengeId, section, data' });
    }

    if (!['formatting', 'exercise', 'mock'].includes(section)) {
      return res.status(400).json({ message: 'Invalid section. Must be formatting, exercise, or mock.' });
    }

    // Find or create submission document
    let submission = await ChallengeSubmission.findOne({ userId, challengeId });

    if (!submission) {
      // Get user info for caching
      const user = await User.findById(userId).select('firstName lastName email phone').lean();
      submission = new ChallengeSubmission({
        userId,
        challengeId,
        userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
        userEmail: user?.email || '',
        userPhone: user?.phone || '',
      });
    }

    // Check if already completed — prevent re-submission
    if (submission.sections[section]?.completed) {
      return res.status(400).json({ message: `Section "${section}" is already completed and locked.` });
    }

    // Check sequential order: Mock → Formatting → Exercise
    if (section === 'formatting' && !submission.sections.mock?.completed) {
      return res.status(400).json({ message: 'Must complete Mock Test section first.' });
    }
    if (section === 'exercise' && !submission.sections.formatting?.completed) {
      return res.status(400).json({ message: 'Must complete Mock Test and Formatting sections first.' });
    }

    // For mock test, compute score server-side using stored correct answers
    let finalData = { ...data };
    if (section === 'mock') {
      const questions = await ChallengeQuestion.find({ challengeId }).lean();
      const userAnswers = data.userAnswers || {};
      let correct = 0;
      const MARKS_PER_QUESTION = 2;
      questions.forEach(q => {
        const qId = (q._id || '').toString();
        const userAns = userAnswers[qId];
        if (userAns && userAns === q.correctOption) {
          correct++;
        }
      });
      finalData.totalQuestions = questions.length;
      finalData.attempted = Object.keys(userAnswers).length;
      finalData.correct = correct;
      finalData.score = correct * MARKS_PER_QUESTION;
      finalData.totalMarks = questions.length * MARKS_PER_QUESTION;
    }

    // Save section result
    submission.sections[section] = {
      completed: true,
      submittedAt: new Date(),
      data: finalData,
    };
    submission.markModified('sections');

    if (section === 'mock') {
      console.log(`[Mock Submit] user=${userId}, score=${finalData.score}/${finalData.totalMarks}, correct=${finalData.correct}, attempted=${finalData.attempted}`);
    }

    await submission.save();

    res.json({ success: true, message: `Section "${section}" submitted successfully.` });
  } catch (err) {
    console.error('submitChallengeSection error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /mock-questions/:challengeId — Get mock test questions
exports.getChallengeMockQuestions = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const questions = await ChallengeQuestion.find({ challengeId })
      .sort({ questionNo: 1 })
      .select('-correctOption') // Don't send correct answers to client
      .lean();

    // Map to frontend-friendly format
    const mapped = questions.map((q, idx) => ({
      id: q._id,
      question: q.question,
      options: [q.optionA, q.optionB, q.optionC, q.optionD],
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      subject: q.subject,
      questionNo: q.questionNo || idx + 1,
    }));

    res.json(mapped);
  } catch (err) {
    console.error('getChallengeMockQuestions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /check-pass/:userId — Check if user has AHC Pass
exports.checkAHCPass = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.json({ hasPass: false });
    }

    const planType = (user.SubscriptionPlanType || '').toLowerCase();
    const examCategory = (user.examCategory || '').toLowerCase();
    const paidUntil = user.paidUntil ? new Date(user.paidUntil) : null;
    const now = new Date();

    // Check if user has an active AHC-level plan
    const hasAHCPlan = planType.includes('ahc') || planType.includes('diamond') || examCategory.includes('ahc');
    const isPaidActive = paidUntil && paidUntil > now;

    res.json({ hasPass: hasAHCPlan && isPaidActive });
  } catch (err) {
    console.error('checkAHCPass error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===================== ADMIN ENDPOINTS =====================

// POST /admin/create — Create a new challenge
exports.createChallenge = async (req, res) => {
  try {
    const { name, description, formattingTemplateId, exerciseNo, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Challenge name is required.' });
    }

    // If activating this challenge, deactivate all others
    if (isActive) {
      await Challenge.updateMany({}, { isActive: false });
    }

    const challenge = new Challenge({
      name,
      description: description || '',
      formattingTemplateId: formattingTemplateId || 'template1',
      exerciseNo: exerciseNo || null,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      isActive: isActive || false,
    });

    await challenge.save();
    res.status(201).json({ success: true, challenge });
  } catch (err) {
    console.error('createChallenge error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /admin/update/:challengeId — Update an existing challenge
exports.updateChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { name, description, formattingTemplateId, exerciseNo, startDate, endDate } = req.body;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    if (name !== undefined) challenge.name = name;
    if (description !== undefined) challenge.description = description;
    if (formattingTemplateId !== undefined) challenge.formattingTemplateId = formattingTemplateId;
    if (exerciseNo !== undefined) challenge.exerciseNo = exerciseNo || null;
    if (startDate !== undefined) challenge.startDate = startDate || null;
    if (endDate !== undefined) challenge.endDate = endDate || null;

    await challenge.save();
    res.json({ success: true, challenge });
  } catch (err) {
    console.error('updateChallenge error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /admin/toggle/:challengeId — Toggle challenge active/inactive
exports.toggleChallengeStatus = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { isActive } = req.body;

    // If activating, deactivate all others first
    if (isActive) {
      await Challenge.updateMany({}, { isActive: false });
    }

    const challenge = await Challenge.findByIdAndUpdate(
      challengeId,
      { isActive },
      { new: true }
    );

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    res.json({ success: true, challenge });
  } catch (err) {
    console.error('toggleChallengeStatus error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /admin/delete/:challengeId — Delete a challenge and all related data
exports.deleteChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    await Promise.all([
      ChallengeQuestion.deleteMany({ challengeId }),
      ChallengeSubmission.deleteMany({ challengeId }),
      Challenge.findByIdAndDelete(challengeId),
    ]);

    res.json({ success: true, message: 'Challenge and all related data deleted.' });
  } catch (err) {
    console.error('deleteChallenge error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /admin/upload-csv — Upload mock test questions from CSV
exports.uploadMockTestCSV = async (req, res) => {
  try {
    const { challengeId } = req.body;

    if (!challengeId) {
      return res.status(400).json({ message: 'challengeId is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required.' });
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    // Parse CSV from buffer (supports comma-separated AND tab-separated)
    const results = [];
    const rawContent = req.file.buffer.toString();
    // Auto-detect separator: if first line has tabs, use tab
    const firstLine = rawContent.split('\n')[0] || '';
    const separator = firstLine.includes('\t') ? '\t' : ',';

    const stream = Readable.from(rawContent);

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv({
          separator,
          mapHeaders: ({ header }) => header.trim().toLowerCase(),
        }))
        .on('data', (row) => {
          // Support multiple column name formats
          const question = row.question || row.questiontext || row['question text'] || '';
          const oA = row.optiona || row['option a'] || row.a || '';
          const oB = row.optionb || row['option b'] || row.b || '';
          const oC = row.optionc || row['option c'] || row.c || '';
          const oD = row.optiond || row['option d'] || row.d || '';
          const rawCorrect = (row.correctoption || row['correct option'] || row['correct answer'] || row.answer || row.correct || '').trim();
          const subject = row.subject || row.topic || '';

          // Map letter answers (a/b/c/d) to actual option text
          const letterMap = { a: oA, b: oB, c: oC, d: oD };
          const correctOption = letterMap[rawCorrect.toLowerCase()] || rawCorrect;

          if (question && oA && oB && oC && oD && correctOption) {
            results.push({
              challengeId,
              question: question.trim(),
              optionA: oA.trim(),
              optionB: oB.trim(),
              optionC: oC.trim(),
              optionD: oD.trim(),
              correctOption: correctOption.trim(),
              subject: subject.trim(),
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      return res.status(400).json({ message: 'No valid questions found in CSV. Check column headers.' });
    }

    // Add question numbers
    results.forEach((q, idx) => { q.questionNo = idx + 1; });

    // Delete existing questions for this challenge and insert new ones
    await ChallengeQuestion.deleteMany({ challengeId });
    await ChallengeQuestion.insertMany(results);

    // Update count on challenge
    challenge.mockQuestionsCount = results.length;
    await challenge.save();

    res.json({
      success: true,
      questionsCount: results.length,
      message: `${results.length} questions uploaded successfully.`,
    });
  } catch (err) {
    console.error('uploadMockTestCSV error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /admin/all — Get all challenges
exports.getAllChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find().sort({ createdAt: -1 }).lean();
    res.json(challenges);
  } catch (err) {
    console.error('getAllChallenges error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /admin/questions/:challengeId — Preview all questions with answers (admin only)
exports.getAdminChallengeQuestions = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const questions = await ChallengeQuestion.find({ challengeId })
      .sort({ questionNo: 1 })
      .lean();
    res.json(questions);
  } catch (err) {
    console.error('getAdminChallengeQuestions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /admin/results/:challengeId — Get all user results for a challenge
exports.getChallengeResults = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const submissions = await ChallengeSubmission.find({ challengeId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(submissions);
  } catch (err) {
    console.error('getChallengeResults error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /admin/results-summary/:challengeId — Aggregate stats for a challenge
// PATCH /admin/reset-section — Reset a user's specific section so they can reattempt
exports.resetChallengeSection = async (req, res) => {
  try {
    const { challengeId, userId, section } = req.body;
    if (!challengeId || !userId || !section) {
      return res.status(400).json({ message: 'challengeId, userId, and section are required.' });
    }
    const validSections = ['formatting', 'exercise', 'mock'];
    if (!validSections.includes(section)) {
      return res.status(400).json({ message: `Invalid section. Must be one of: ${validSections.join(', ')}` });
    }

    const submission = await ChallengeSubmission.findOne({ challengeId, userId });
    if (!submission) {
      return res.status(404).json({ message: 'No submission found for this user and challenge.' });
    }

    // Reset the section data
    submission.sections[section] = {
      completed: false,
      score: 0,
      timeTaken: 0,
      details: {},
    };
    submission.markModified('sections');
    await submission.save();

    res.json({ message: `Section "${section}" reset successfully for user ${userId}.`, submission });
  } catch (err) {
    console.error('resetChallengeSection error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /feedback — Submit post-challenge feedback
exports.submitChallengeFeedback = async (req, res) => {
  try {
    const { userId, challengeId, feedback } = req.body;

    if (!userId || !challengeId || !feedback) {
      return res.status(400).json({ message: 'Missing required fields: userId, challengeId, feedback' });
    }

    const submission = await ChallengeSubmission.findOne({ userId, challengeId });
    if (!submission) {
      return res.status(404).json({ message: 'No submission found for this user and challenge.' });
    }

    // Only allow feedback if all 3 sections are completed
    if (!submission.sections.mock?.completed || !submission.sections.formatting?.completed || !submission.sections.exercise?.completed) {
      return res.status(400).json({ message: 'Must complete all 3 sections before submitting feedback.' });
    }

    // Don't allow re-submission of feedback
    if (submission.feedback?.submittedAt) {
      return res.status(400).json({ message: 'Feedback already submitted.' });
    }

    submission.feedback = {
      testExperience: feedback.testExperience,
      mockTestQuestions: feedback.mockTestQuestions,
      rapidStenoExperience: feedback.rapidStenoExperience,
      formattingRating: feedback.formattingRating,
      exerciseRating: feedback.exerciseRating,
      submittedAt: new Date(),
    };
    submission.markModified('feedback');
    await submission.save();

    res.json({ success: true, message: 'Feedback submitted successfully.' });
  } catch (err) {
    console.error('submitChallengeFeedback error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /admin/delete-submission — Delete a user's entire submission
exports.deleteUserSubmission = async (req, res) => {
  try {
    const { challengeId, userId } = req.body;
    if (!challengeId || !userId) {
      return res.status(400).json({ message: 'challengeId and userId are required.' });
    }
    const result = await ChallengeSubmission.findOneAndDelete({ challengeId, userId });
    if (!result) {
      return res.status(404).json({ message: 'No submission found for this user and challenge.' });
    }
    res.json({ success: true, message: 'User submission deleted successfully.' });
  } catch (err) {
    console.error('deleteUserSubmission error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getChallengeResultSummary = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const submissions = await ChallengeSubmission.find({ challengeId }).lean();

    const totalParticipants = submissions.length;
    const formattingCompleted = submissions.filter(s => s.sections?.formatting?.completed).length;
    const exerciseCompleted = submissions.filter(s => s.sections?.exercise?.completed).length;
    const mockCompleted = submissions.filter(s => s.sections?.mock?.completed).length;
    const allCompleted = submissions.filter(s =>
      s.sections?.formatting?.completed &&
      s.sections?.exercise?.completed &&
      s.sections?.mock?.completed
    ).length;

    res.json({
      totalParticipants,
      formattingCompleted,
      exerciseCompleted,
      mockCompleted,
      allCompleted,
    });
  } catch (err) {
    console.error('getChallengeResultSummary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
