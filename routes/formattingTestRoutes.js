const express = require('express');
const router = express.Router();
const { 
  createFormattingResult, 
  getMyFormattingResults, 
  getAllFormattingResults, 
  getFormattingResultsGroupedByUser,
  getUserFormattingAnalytics,
  getAllUsersBestFormattingData,
  getPublicFormattingLeaderboard,
  getFormattingDebugLogs,
  uploadRecording,
} = require('../controllers/formattingTestController');
const { userProtect } = require('../middleware/userMiddleware');
const adminProtect = require('../middleware/adminMiddleware');

// User protected leaderboard endpoint
router.get('/leaderboard', userProtect, getPublicFormattingLeaderboard);

// User endpoints
router.post('/result', userProtect, createFormattingResult);
router.post('/recording/upload', userProtect, uploadRecording);
router.get('/my-results', userProtect, getMyFormattingResults);
router.get('/analytics', userProtect, getUserFormattingAnalytics);

// Admin endpoints
router.get('/all', adminProtect, getAllFormattingResults);
router.get('/admin/users', adminProtect, getFormattingResultsGroupedByUser);
router.get('/admin/best-submissions', adminProtect, getAllUsersBestFormattingData);
router.get('/admin/debug-logs', adminProtect, getFormattingDebugLogs);

module.exports = router;
