const mongoose = require('mongoose');

const testRecordingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  template: {
    type: String,
    default: 'default'
  },
  font: String,
  fontSize: Number,
  capsLock: Boolean,
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  actions: [{
    time: Number, // milliseconds from start
    type: String, // 'keypress', 'format', 'delete', 'paste', 'snapshot'
    key: String,
    action: String,
    selection: String,
    html: String,
    delta: Object
  }],
  snapshots: [{
    time: Number,
    html: String
  }],
  finalSubmission: String,
  mistakes: {
    word: Number,
    format: Number,
    punct: Number,
    total: Number
  },
  score: Number,
  testDuration: Number, // seconds
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000 // Auto-delete after 30 days
  }
});

// Index for efficient queries
testRecordingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('TestRecording', testRecordingSchema);
