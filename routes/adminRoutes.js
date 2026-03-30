// const express = require('express');
// const router = express.Router();
// const adminController = require('../controllers/adminController');
// //const authMiddleware = require('../middleware/authMiddleware');
// const adminAuth = require('../middleware/authMiddleware'); // Middleware to validate admin token

// // Login route
// router.post('/login', adminController.adminLogin);
// router.post('/mark-paid', adminAuth, adminController.markUserAsPaid); 
// router.get('/admin/users', adminAuth, adminController.getAllUsers); 
// router.delete('/users/:id', adminAuth, adminController.deleteUserById); // ✅ NEW DELETE API
// router.get('/online-users', adminController.getOnlineUsers);

// router.post('/login/request-otp', adminController.adminLoginRequestOtp);
// router.post('/login/verify-otp', adminController.adminVerifyOtp);

// router.put('/edit-user/:id', adminAuth, adminController.editUserByAdmin);

// // Example of protected route
// router.get('/dashboard', adminAuth, (req, res) => {
//   res.status(200).json({ message: 'Welcome to Admin Dashboard' });
// });

// module.exports = router;
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/authMiddleware');
const User = require('../models/userModel'); // ✅ Make sure this is imported
const { 
    getAllDictations,
    getDictationById, 
    createDictation,
    updateDictation,
    deleteDictation,
} = require('../controllers/dictationController');

const {
    createTypingMatter,
    updateTypingMatter,
    deleteTypingMatter,
} = require('../controllers/typingTestController');
const { getDictationUsageAnalytics } = require('../controllers/userDictationsubmissionController');

// ✅ Admin: Delete User Dictation Submission
router.delete('/dictation-submissions/:submissionId', adminAuth, adminController.deleteUserDictationSubmission);

// ✅ Admin: Get ALL User Dictation Submissions
router.get('/dictation-submissions', adminAuth, adminController.getAllUserDictationSubmissions);

// ✅ Admin Login Routes (legacy email OTP)
router.post('/login', adminController.adminLogin);
router.post('/login/request-otp', adminController.adminLoginRequestOtp);
router.post('/login/verify-otp', adminController.adminVerifyOtp);

// ✅ Admin WhatsApp OTP Login Routes
router.get('/login/admin-users', adminController.getAdminUsers);
router.post('/login/whatsapp-otp/request', adminController.requestAdminWhatsAppOtp);
router.post('/login/whatsapp-otp/verify', adminController.verifyAdminWhatsAppOtp);

// ✅ Admin Protected Routes
router.post('/mark-paid', adminAuth, adminController.markUserAsPaid);
router.get('/admin/users', adminAuth, adminController.getAllUsers);
router.delete('/users/:id', adminAuth, adminController.deleteUserById);
router.put('/edit-user/:id', adminAuth, adminController.editUserByAdmin);
// ✅ Update only CRM fields for a user
router.put('/users/:id/crm', adminAuth, adminController.updateUserCrmFields);
router.get('/online-users', adminController.getOnlineUsers);

// ✅ Subscription management
router.post('/users/:id/subscription', adminAuth, adminController.adminSetUserSubscription);
router.patch('/users/:id/subscription-dates', adminAuth, adminController.adminUpdateUserSubscriptionDates);

// ✅ Admin Weekly Report for a specific user
router.get('/users/:id/weekly-report', adminAuth, adminController.adminWeeklyUserReport);

// ✅ Admin: Get Users with >2 Devices
router.get('/reports/multi-device-users', adminAuth, adminController.getMultiDeviceUsers);

// ✅ Admin: User Device & Security Report
router.get('/users/:userId/device-report', adminController.getUserDeviceReport);

// ✅ Admin: Force logout a user (invalidate all active sessions)
router.post('/users/:id/force-logout', adminAuth, adminController.adminForceLogoutUser);

// ✅ NEW: Get user by email
router.get('/user-by-email/:email', adminAuth, async (req, res) => {
  try {
    const email = req.params.email;


    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') } // case-insensitive match
    });


    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }


    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user by email:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});


// ✅ Test Dashboard Route
router.get('/dashboard', adminAuth, (req, res) => {
  res.status(200).json({ message: 'Welcome to Admin Dashboard' });
});

router.put('/dictations/:id', adminAuth, updateDictation);
router.delete('/dictations/:id', adminAuth, deleteDictation);

// Typing Matter Admin Routes
router.post('/typing-matter', adminAuth, createTypingMatter);
router.put('/typing-matter/:id', adminAuth, updateTypingMatter);
router.delete('/typing-matter/:id', adminAuth, deleteTypingMatter);

// Analytics: Dictation usage by category and topic (title)
router.get('/analytics/dictations-usage', adminAuth, getDictationUsageAnalytics);


module.exports = router;