const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// Login route
router.post('/login', adminController.adminLogin);

// Example of protected route
router.get('/dashboard', authMiddleware, (req, res) => {
  res.status(200).json({ message: 'Welcome to Admin Dashboard' });
});

module.exports = router;
