const mongoose = require('mongoose');

const matterReadingSubmissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  originalParagraph: {
    type: String,
    required: true,
  },
  voiceTranscript: {
    type: String,
    required: true,
  },
  accuracy: {
    type: Number,
    required: true,
  },
  totalMistakes: {
    type: Number,
    required: true,
  },
  durationSeconds: {
    type: Number,
    required: true,
  },
  dictationSpeed: {
    type: Number,
    required: true,
  },
  originalWords: {
    type: Number,
    required: true,
  },
  spokenWords: {
    type: Number,
    required: true,
  },
  speakPunctuationMode: {
    type: String,
    enum: ['on', 'off'],
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  studentSuggestion: {
    type: String,
  },
  submissionDate: {
    type: Date,
    default: Date.now,
  },
  totalCountOfUsage: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('MatterReadingSubmission', matterReadingSubmissionSchema, 'matter_reading_submissions');

