submissions.jsconst express = require('express');
const router = express.Router();
const UserDictationSubmission = require('../models/UserDictationSubmission');
const User = require('../models/User');
const Dictation = require('../models/Dictation');

// POST /api/submissions
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      dictationId,
      totalMistakes,
      capitalMistakes,
      spellingMistakes,
      extraWords,
      missingWords,
    } = req.body;

    // Validate user and dictation existence
    const user = await User.findById(userId);
    const dictation = await Dictation.findById(dictationId);

    if (!user || !dictation) {
      return res.status(404).json({ message: "User or Dictation not found" });
    }

    const newSubmission = new UserDictationSubmission({
      user: userId,
      dictation: dictationId,
      totalMistakes,
      capitalMistakes,
      spellingMistakes,
      extraWords,
      missingWords,
    });

    await newSubmission.save();

    return res.status(201).json({ message: "Submission saved successfully", data: newSubmission });
  } catch (error) {
    console.error("Submission Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
