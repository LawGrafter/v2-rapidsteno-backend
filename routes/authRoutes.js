const express = require('express');
const {
  register,
  login,
  updateUserStatus,
  getAllUsers,
  getFilteredUsers,
  getUserById,
  getSelfUserById,
  deleteUserById,
  deleteAllUsers,
  updateUserProfile,
  // forgotPassword
} = require('../controllers/authController');

const { verifyOtp, trackUserActivity, forgotPassword, resetPassword, sendOtp, markTourAsSeen, markComparisonTourAsSeen, markNotificationAsSeen, verifyOtpAndRegister } = require("../controllers/authController");
const { userProtect } = require("../middleware/userMiddleware");
const checkUserActivity = require('../middleware/checkUserActivity');
const adminProtect = require("../middleware/authMiddleware");
const { getSourceUrlComment } = require('puppeteer');

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp-register', verifyOtpAndRegister);

router.put('/users/:id/mark-tour-seen', userProtect, markTourAsSeen);
router.put('/users/:id/mark-comparison-tour-seen', userProtect, markComparisonTourAsSeen);

router.put('/users/:userId/mark-notification-seen/:notificationId', markNotificationAsSeen);

router.put('/update-profile/:id', userProtect, updateUserProfile);

router.post('/track-activity', trackUserActivity);


router.post('/register', register);
router.post('/login', login);
router.patch('/update-status', updateUserStatus);
// router.post('/forgot-password', forgotPassword); 

// ✅ Get all users
router.get('/users', adminProtect, getAllUsers);

// ✅ Filter users by status, subscriptionType, examCategory, repeatUser
router.get('/users/filter', adminProtect, getFilteredUsers);


// ✅ Get user by ID
router.get('/users/:id', adminProtect, getUserById);

router.get('/check-user-tour/:id', userProtect, getSelfUserById);

// ✅ Delete a single user
router.delete('/users/:id', adminProtect, deleteUserById);

// ✅ Delete all users
router.delete('/users', adminProtect, deleteAllUsers);

router.post("/verify-otp", verifyOtp);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// ✅ New Route: Validate Session
// router.get('/validate-session', userProtect, (req, res) => {
//   res.status(200).json({ message: 'Session is valid' });
// });
// ✅ Updated Route: Validate Session with Inactivity Check
router.get('/validate-session', userProtect, checkUserActivity, (req, res) => {
  res.status(200).json({ message: 'Session is valid' });
});


module.exports = router;
