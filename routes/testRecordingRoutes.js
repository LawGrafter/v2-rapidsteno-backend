const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/userAuthMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  saveTestRecording,
  getAllRecordings,
  getRecordingById,
  getUserLatestRecording,
  deleteRecording
} = require('../controllers/testRecordingController');

// User routes
router.post('/save', protect, saveTestRecording);
router.get('/my-latest', protect, getUserLatestRecording);

// Admin routes
router.get('/all', adminMiddleware, getAllRecordings);
router.get('/user/:userId', adminMiddleware, getUserLatestRecording);
router.get('/:id', adminMiddleware, getRecordingById);
router.delete('/:id', adminMiddleware, deleteRecording);

module.exports = router;
