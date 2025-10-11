const mongoose = require('mongoose');

const selfPracticeSubmissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Original paragraph shown to user
  originalParagraph: {
    type: String,
    required: true,
  },
  // What user typed
  userTypeText: {
    type: String,
    required: true,
  },
  // Time taken in seconds
  timeTaken: {
    type: Number,
    required: true,
  },
  // Summary counts
  totalMistakes: { type: Number, required: true },
  capitalMistakes: { type: Number, required: true },
  punctuationMistakes: { type: Number, required: true },
  spacingMistakes: { type: Number, required: true },
  spellingMistakes: { type: Number, required: true },
  missingWords: { type: Number, required: true },
  extraWords: { type: Number, required: true },

  // Optional metrics
  totalWords: { type: Number },
  userWords: { type: Number },
  accuracy: { type: Number },

  // Detailed mistake arrays
  mistakeSummary: {
    capitalSpellingMistakes: { type: [String], default: [] },
    punctuationMistakes: { type: [String], default: [] },
    spacingMistakes: { type: [String], default: [] },
    spellingMistakes: { type: [String], default: [] },
    missingWords: { type: [String], default: [] },
    extraWords: { type: [String], default: [] },
  },

  // User experience rating (e.g., 1-5)
  userExperienceRating: { type: Number, min: 1, max: 5, required: true },

  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('SelfPracticeSubmission', selfPracticeSubmissionSchema, 'self_practice_submissions');