const mongoose = require('mongoose');

const formattingDetailSchema = new mongoose.Schema({
  total: { type: Number, required: true },
  details: [{ type: String }], // list of bullet points (each line/mistake)
}, { _id: false });

const formattingTestResultSchema = new mongoose.Schema({
  // References
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Optional linkage to a matter/exercise if applicable (keep optional to be flexible)
  matter: { type: mongoose.Schema.Types.ObjectId, ref: 'TypingMatter' },
  dictation: { type: mongoose.Schema.Types.ObjectId, ref: 'Dictation' },
  
  // Template identifier
  template: { type: String, default: 'default' },

  // Sections
  formattingMistakes: formattingDetailSchema, // Formatting Mistakes (Bold/Italic/Underline/Indent/Alignment)
  wordMistakes: formattingDetailSchema,      // Word Mistakes (Missing / Extra)
  punctuationMistakes: new mongoose.Schema({
    total: { type: Number, required: true },
    details: [{ type: String }], // optional list of punctuation differences
  }, { _id: false }),

  // Totals & Score
  wordsTyped: { type: Number, required: true },
  totalWords: { type: Number, required: true },
  markPerMistake: { type: Number, required: true },

  wordMistakesCount: { type: Number, required: true },
  formattingMistakesCount: { type: Number, required: true },
  punctuationMistakesCount: { type: Number, required: true },
  totalMistakes: { type: Number, required: true },

  marksDeducted: { type: Number, required: true },
  marksAwarded: { type: Number, required: true }, // e.g., 0 / 50 -> store numeric earned marks (0)

  // Free text fields from UI
  formula: { type: String },
  notes: { type: String },

  // Raw payload for traceability (optional)
  rawPayload: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('FormattingTestResult', formattingTestResultSchema);
