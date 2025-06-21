const mongoose = require('mongoose');

const pitmanExerciseSchema = new mongoose.Schema({
  exerciseNo: { type: Number, required: true, unique: true },
  exerciseText: { type: String, required: true },
  imageLink: { type: String, required: true }
});

module.exports = mongoose.model('PitmanExercise', pitmanExerciseSchema);
