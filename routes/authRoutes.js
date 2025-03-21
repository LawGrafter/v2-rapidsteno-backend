// const express = require('express');
// const { register, login, updateUserStatus } = require('../controllers/authController');

// const router = express.Router();

// router.post('/register', register);
// router.post('/login', login); // New login route
// router.patch('/update-status', updateUserStatus);

// module.exports = router;

const express = require('express');
const {
  register,
  login,
  updateUserStatus,
  getAllUsers,
  getUserById,
  deleteUserById,
  deleteAllUsers,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.patch('/update-status', updateUserStatus);

// ✅ Get all users
router.get('/users', getAllUsers);

// ✅ Get user by ID
router.get('/users/:id', getUserById);

// ✅ Delete a single user
router.delete('/users/:id', deleteUserById);

// ✅ Delete all users
router.delete('/users', deleteAllUsers);

module.exports = router;
