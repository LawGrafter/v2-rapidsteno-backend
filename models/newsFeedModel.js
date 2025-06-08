const mongoose = require('mongoose');

const newsFeedSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NewsFeed', newsFeedSchema);
