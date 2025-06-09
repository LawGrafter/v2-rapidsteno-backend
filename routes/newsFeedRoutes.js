const express = require('express');
const router = express.Router();
const { createNewsMessage, getNewsFeed } = require('../controllers/newsFeedController');
const { userProtect } = require("../middleware/userMiddleware");
const adminProtect = require("../middleware/authMiddleware");

// Admin-only: Create news message
router.post('/admin/news-feed', adminProtect, createNewsMessage);

// User: Get all news feed messages

router.get('/user/news-feed', userProtect, getNewsFeed);

module.exports = router;
