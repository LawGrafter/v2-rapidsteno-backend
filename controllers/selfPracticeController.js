const SelfPracticeSubmission = require('../models/SelfPracticeSubmission');
const User = require('../models/userModel');

// Helper to normalize arrays based on previous fix logic
function normalizeArray(input) {
  if (input === undefined) return undefined; // allow server to compute if needed
  if (input === 0) return []; // explicit 0 -> empty array
  if (Array.isArray(input)) return input;
  return []; // fallback
}

exports.submitSelfPractice = async (req, res) => {
  try {
    const {
      userId,
      originalParagraph,
      userTypeText,
      timeTaken,
      // counts can be provided or computed from arrays
      totalMistakes,
      capitalMistakes,
      punctuationMistakes,
      spacingMistakes,
      spellingMistakes,
      missingWords,
      extraWords,
      totalWords,
      userWords,
      accuracy,
      userExperienceRating,
      // arrays
      mistakeSummary = {},
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Normalize arrays according to requested behavior
    const capitalArr = normalizeArray(mistakeSummary.capitalSpellingMistakes);
    const punctuationArr = normalizeArray(mistakeSummary.punctuationMistakes);
    const spacingArr = normalizeArray(mistakeSummary.spacingMistakes);
    const spellingArr = normalizeArray(mistakeSummary.spellingMistakes);
    const missingArr = normalizeArray(mistakeSummary.missingWords);
    const extraArr = normalizeArray(mistakeSummary.extraWords);

    // Compute counts if arrays provided and counts undefined
    const counts = {
      capitalMistakes: capitalMistakes !== undefined ? capitalMistakes : (capitalArr ? capitalArr.length : 0),
      punctuationMistakes: punctuationMistakes !== undefined ? punctuationMistakes : (punctuationArr ? punctuationArr.length : 0),
      spacingMistakes: spacingMistakes !== undefined ? spacingMistakes : (spacingArr ? spacingArr.length : 0),
      spellingMistakes: spellingMistakes !== undefined ? spellingMistakes : (spellingArr ? spellingArr.length : 0),
      missingWords: missingWords !== undefined ? missingWords : (missingArr ? missingArr.length : 0),
      extraWords: extraWords !== undefined ? extraWords : (extraArr ? extraArr.length : 0),
    };

    const computedTotalMistakes = totalMistakes !== undefined
      ? totalMistakes
      : counts.capitalMistakes + counts.punctuationMistakes + counts.spacingMistakes + counts.spellingMistakes + counts.missingWords + counts.extraWords;

    const submission = new SelfPracticeSubmission({
      user: userId,
      originalParagraph,
      userTypeText,
      timeTaken,
      totalMistakes: computedTotalMistakes,
      capitalMistakes: counts.capitalMistakes,
      punctuationMistakes: counts.punctuationMistakes,
      spacingMistakes: counts.spacingMistakes,
      spellingMistakes: counts.spellingMistakes,
      missingWords: counts.missingWords,
      extraWords: counts.extraWords,
      totalWords,
      userWords,
      accuracy,
      userExperienceRating,
      mistakeSummary: {
        capitalSpellingMistakes: capitalArr ?? [],
        punctuationMistakes: punctuationArr ?? [],
        spacingMistakes: spacingArr ?? [],
        spellingMistakes: spellingArr ?? [],
        missingWords: missingArr ?? [],
        extraWords: extraArr ?? [],
      },
    });

    await submission.save();

    return res.status(201).json({
      message: 'Self-practice submission saved successfully',
      data: submission,
    });
  } catch (error) {
    console.error('SelfPractice Submit Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};