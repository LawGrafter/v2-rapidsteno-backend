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

// Bulk Fix Quotes - Replace curly quotes with straight quotes
exports.bulkFixQuotes = async (req, res) => {
  try {
    const exercises = await PitmanExercise.find();
    let updatedCount = 0;

    for (const exercise of exercises) {
      const originalText = exercise.exerciseText;
      // Replace left and right double curly quotes with straight quotes
      const fixedText = originalText
        .replace(/[\u201C\u201D]/g, '"')  // " and "
        .replace(/[\u2018\u2019]/g, "'"); // ' and '
      
      if (originalText !== fixedText) {
        exercise.exerciseText = fixedText;
        await exercise.save();
        updatedCount++;
      }
    }

    res.json({ 
      success: true, 
      message: `Fixed quotes in ${updatedCount} exercises`,
      updatedCount 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// Bulk Fix Court - Capitalize lowercase "court" to "Court"
exports.bulkFixCourt = async (req, res) => {
  try {
    const exercises = await PitmanExercise.find();
    let updatedCount = 0;

    for (const exercise of exercises) {
      const originalText = exercise.exerciseText;
      // Replace lowercase "court" with "Court" (word boundary to avoid partial matches)
      const fixedText = originalText.replace(/\bcourt\b/g, 'Court');
      
      if (originalText !== fixedText) {
        exercise.exerciseText = fixedText;
        await exercise.save();
        updatedCount++;
      }
    }

    res.json({ 
      success: true, 
      message: `Fixed court capitalization in ${updatedCount} exercises`,
      updatedCount 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};
