const express = require('express');
const router = express.Router();
const {
  submitMatterReading,
  getAllMatterReadingSubmissions,
  getMatterReadingDailyStats,
} = require('../controllers/matterReadingController');
const { userProtect } = require('../middleware/userMiddleware');
const adminProtect = require('../middleware/adminMiddleware');

router.post('/', userProtect, submitMatterReading);
router.get('/admin/submissions', adminProtect, getAllMatterReadingSubmissions);
router.get('/admin/daily-stats', adminProtect, getMatterReadingDailyStats);

module.exports = router;

