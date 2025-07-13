const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [
    {
      optionText: { type: String, required: true }
    }
  ],
  correctOptionIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  }
}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);
