const Question = require("../models/questionModel");

// Add Question
exports.createQuestion = async (req, res) => {
  try {
    const { questionText, options, correctOptionIndex } = req.body;

    if (!questionText || !options || options.length !== 4) {
      return res.status(400).json({ error: "Question must have 4 options" });
    }

    const question = await Question.create({ questionText, options, correctOptionIndex });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Questions
exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Single Question
exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: "Question not found" });
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Question
exports.updateQuestion = async (req, res) => {
  try {
    const { questionText, options, correctOptionIndex } = req.body;
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { questionText, options, correctOptionIndex },
      { new: true }
    );
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Question
exports.deleteQuestion = async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ message: "Question deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
