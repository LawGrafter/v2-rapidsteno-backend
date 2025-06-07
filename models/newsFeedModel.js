const mongoose = require('mongoose');

const newsFeedSchema = new mongoose.Schema({
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NewsFeed', newsFeedSchema);
