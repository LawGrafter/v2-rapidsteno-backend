const mongoose = require("mongoose");

const pitmanSubmissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  exercise: { type: mongoose.Schema.Types.ObjectId, ref: "PitmanExercise", required: true },
  exerciseNo: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  totalMistakes: { type: Number, required: true },
  capitalMistakes: { type: Number, required: true },
  spellingMistakes: { type: Number, required: true },
  punctuationMistakes: { type: Number, required: true },
  extraWords: { type: Number, required: true },
  missingWords: { type: Number, required: true },
  spacingMistakes: { type: Number, required: true },
  mistakeSummary: {
    capitalWords: [String],
    spellingWords: [String],
    punctuationMarks: [String],
    extraWords: [String],
    missingWords: [String],
    spacingMistakes: [String],
  },
  timeTaken: { type: Number, required: true }, // in seconds
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("PitmanExerciseSubmission", pitmanSubmissionSchema);
