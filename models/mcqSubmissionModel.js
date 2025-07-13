// models/mcqSubmissionModel.js
const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // <-- Link to User collection
    required: true
  },
  userName: { type: String, required: true }, // Optional if you're using userId
  examCategory: { type: String, required: true },
  answers: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
      selectedIndex: { type: Number, required: true }
    }
  ],
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Submission", submissionSchema);
