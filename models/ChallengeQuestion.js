const mongoose = require('mongoose');

const challengeQuestionSchema = new mongoose.Schema({
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true, index: true },

  question: { type: String, required: true },
  optionA: { type: String, required: true },
  optionB: { type: String, required: true },
  optionC: { type: String, required: true },
  optionD: { type: String, required: true },
  correctOption: { type: String, required: true }, // "A", "B", "C", "D" or full text
  subject: { type: String, default: '' },

  // Optional ordering
  questionNo: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('ChallengeQuestion', challengeQuestionSchema);
