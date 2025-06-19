const PitmanExercise = require('../models/pitmanExercise.model');

// Create
exports.createExercise = async (req, res) => {
  try {
    const newExercise = await PitmanExercise.create(req.body);
    res.status(201).json(newExercise);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get All
exports.getAllExercises = async (req, res) => {
  try {
    const exercises = await PitmanExercise.find();
    res.json(exercises);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get One
exports.getExerciseById = async (req, res) => {
  try {
    const exercise = await PitmanExercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Not found' });
    res.json(exercise);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update
exports.updateExercise = async (req, res) => {
  try {
    const updated = await PitmanExercise.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete
exports.deleteExercise = async (req, res) => {
  try {
    const deleted = await PitmanExercise.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
