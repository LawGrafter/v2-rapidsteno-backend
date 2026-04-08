const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },

  // Section configuration
  formattingTemplateId: { type: String, default: 'template1' },
  exerciseNo: { type: Number },

  // Mock test questions count (auto-updated on CSV upload)
  mockQuestionsCount: { type: Number, default: 0 },

  // Schedule
  startDate: { type: Date },
  endDate: { type: Date },

  // Status
  isActive: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);
