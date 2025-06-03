const express = require('express');
const {
  register,
  login,
  updateUserStatus,
  getAllUsers,
  getFilteredUsers,
  getUserById,
  deleteUserById,
  deleteAllUsers,
  // forgotPassword
} = require('../controllers/authController');

const { verifyOtp, forgotPassword, resetPassword } = require("../controllers/authController");
const { userProtect } = require("../middleware/userMiddleware");
const checkUserActivity = require('../middleware/checkUserActivity');


const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.patch('/update-status', updateUserStatus);
// router.post('/forgot-password', forgotPassword); 

// ✅ Get all users
router.get('/users', getAllUsers);

// ✅ Filter users by status, subscriptionType, examCategory, repeatUser
router.get('/users/filter', getFilteredUsers);


// ✅ Get user by ID
router.get('/users/:id', getUserById);

// ✅ Delete a single user
router.delete('/users/:id', deleteUserById);

// ✅ Delete all users
router.delete('/users', deleteAllUsers);

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
