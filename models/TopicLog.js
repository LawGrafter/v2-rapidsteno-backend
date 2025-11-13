const mongoose = require('mongoose');

const topicLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  exam_name: {
    type: String,
    required: true,
    trim: true
  },
  subject_name: {
    type: String,
    required: true,
    trim: true
  },
  topic_name: {
    type: String,
    required: true,
    trim: true
  },
  learning_percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  time_spent_min: {
    type: Number,
    required: true,
    min: 0
  },
  emoji_reaction: {
    type: String,
    required: true,
    enum: ['😄', '😐', '😣']
  },
  learning_source: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  importance_level: {
    type: String,
    required: true,
    enum: ['normal', 'medium', 'very_important']
  },
  pyq_practice_status: {
    type: String,
    required: true,
    enum: ['done', 'not_yet']
  },
  date_learned: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create compound index for efficient querying
topicLogSchema.index({ user_id: 1, exam_name: 1, subject_name: 1, topic_name: 1 });

const TopicLog = mongoose.model('TopicLog', topicLogSchema);

module.exports = TopicLog;