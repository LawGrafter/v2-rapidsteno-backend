// const mongoose = require('mongoose');

// const userDictationSubmissionSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   dictation: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Dictation',
//     required: true,
//   },
//   dictationTitle: {
//     type: String,
//     required: true,
//   },
//   dictationType: {
//     type: String,
//     required: true,
//   },
//   userTypeParagraph: { // ✅ New field
//     type: String,
//     required: true,
//   },
//   totalMistakes: { type: Number, required: true },
//   capitalMistakes: { type: Number, required: true },
//   spellingMistakes: { type: Number, required: true },
//   extraWords: { type: Number, required: true },
//   missingWords: { type: Number, required: true },
//   submittedAt: { type: Date, default: Date.now },
// }, { timestamps: true });

// module.exports = mongoose.model('UserDictationSubmission', userDictationSubmissionSchema, 'submissions');


const mongoose = require('mongoose');

const userDictationSubmissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  dictation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dictation',
    required: true,
  },
  dictationTitle: {
    type: String,
    required: true,
  },
  dictationType: {
    type: String,
    required: true,
  },
  userTypeParagraph: {
    type: String,
    required: true,
  },
  totalMistakes: { type: Number, required: true },
  capitalMistakes: { type: Number, required: true },
  spellingMistakes: { type: Number, required: true },
  extraWords: { type: Number, required: true },
  missingWords: { type: Number, required: true },
  playbackSpeed: { type: Number, required: true },   // ✅ new
  typingTimer: { type: Number, required: true },     // ✅ new (in seconds)
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('UserDictationSubmission', userDictationSubmissionSchema, 'submissions');
