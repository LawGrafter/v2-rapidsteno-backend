const express = require('express');
const router = express.Router();
const { createNewsMessage, getNewsFeed } = require('../controllers/newsFeedController');

// Admin-only: Create news message
router.post('/admin/news-feed', createNewsMessage);

// User: Get all news feed messages
router.get('/user/news-feed', getNewsFeed);

module.exports = router;
