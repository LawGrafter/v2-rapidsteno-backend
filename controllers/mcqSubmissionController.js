// controllers/mcqsubmissionController.js
const Submission = require("../models/mcqSubmissionModel");
const Question = require("../models/questionModel");

exports.submitTest = async (req, res) => {
  try {
    const { userId, userName, examCategory, answers } = req.body;

    if (!userId || !userName || !examCategory || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let score = 0;

    for (let ans of answers) {
      const question = await Question.findById(ans.questionId);
      if (question && question.correctOptionIndex === ans.selectedIndex) {
        score++;
      }
    }

    const submission = await Submission.create({
      userId,
      userName,
      examCategory,
      answers,
      score,
      total: answers.length
    });

    res.status(201).json({
      message: "Test submitted successfully",
      score,
      total: answers.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET: Submissions by category (rank-wise)
exports.getByCategory = async (req, res) => {
  try {
    const category = req.params.category;

    const submissions = await Submission.find({ examCategory: category }).sort({ score: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET: All Submissions sorted by score DESC (leaderboard)
exports.getAllSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find().sort({ score: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
