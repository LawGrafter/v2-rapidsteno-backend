const express = require('express');
const router = express.Router();
const {
  createNotification,
  getAllNotifications,
  deleteNotification,
  toggleNotification,
  searchUsers,
  getAudienceCounts,
  getUserNotifications,
  dismissNotification,
  trackClick,
} = require('../controllers/notificationController');
const adminProtect = require('../middleware/authMiddleware');
const { userProtect } = require('../middleware/userMiddleware');

// ── Admin routes ──
router.post('/admin/create', adminProtect, createNotification);
router.get('/admin/all', adminProtect, getAllNotifications);
router.delete('/admin/:id', adminProtect, deleteNotification);
router.patch('/admin/toggle/:id', adminProtect, toggleNotification);
router.get('/admin/search-users', adminProtect, searchUsers);
router.get('/admin/audience-counts', adminProtect, getAudienceCounts);

// ── User routes ──
router.get('/user/my', userProtect, getUserNotifications);
router.patch('/user/dismiss/:id', userProtect, dismissNotification);
router.patch('/user/click/:id', userProtect, trackClick);

module.exports = router;
