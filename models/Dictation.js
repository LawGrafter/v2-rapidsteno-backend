const mongoose = require('mongoose');

const dictationSchema = new mongoose.Schema({
  fileupload: {
    type: mongoose.Schema.Types.ObjectId, // GridFS file id
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['Court', 'SSC', 'Railway', 'KC', 'Progressive', 'Medical', 'AIIMS','Other'],
    default: 'Other',
    required: true,
  },
  paragraphText: {
    type: String,
    required: true,
  },
  totalwords: {
    type: Number,
    required: true,
  },
  speed: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Dictation', dictationSchema, 'steno');
