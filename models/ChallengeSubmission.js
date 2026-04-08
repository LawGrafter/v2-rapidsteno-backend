const mongoose = require('mongoose');

const sectionDataSchema = new mongoose.Schema({
  completed: { type: Boolean, default: false },
  submittedAt: { type: Date },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const challengeSubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true, index: true },

  // User info cached for quick lookups
  userName: { type: String, default: '' },
  userEmail: { type: String, default: '' },
  userPhone: { type: String, default: '' },

  // Section results
  sections: {
    formatting: { type: sectionDataSchema, default: () => ({}) },
    exercise: { type: sectionDataSchema, default: () => ({}) },
    mock: { type: sectionDataSchema, default: () => ({}) },
  },
}, { timestamps: true });

// Compound index: one submission per user per challenge
challengeSubmissionSchema.index({ userId: 1, challengeId: 1 }, { unique: true });

module.exports = mongoose.model('ChallengeSubmission', challengeSubmissionSchema);
