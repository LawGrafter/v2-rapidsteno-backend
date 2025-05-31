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

module.exports = router;
