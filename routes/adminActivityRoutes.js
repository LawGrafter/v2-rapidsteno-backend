const express = require('express');
const router = express.Router();
const { getUserActivityLogs, getAllActivityLogs, getUserActivityLogsByEmail } = require('../controllers/adminActivityController');
const adminProtect = require('../middleware/authMiddleware'); // Admin protection

// Get logs for a specific user by email (Admin only)
router.post('/user-by-email', adminProtect, getUserActivityLogsByEmail);

// Get logs for a specific user by ID (Admin only)
router.get('/user/:userId', adminProtect, getUserActivityLogs);

// Get all logs (Admin only)
router.get('/all', adminProtect, getAllActivityLogs);

module.exports = router;
