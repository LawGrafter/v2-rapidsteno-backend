const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
//const authMiddleware = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/authMiddleware'); // Middleware to validate admin token

// Login route
router.post('/login', adminController.adminLogin);
router.post('/mark-paid', adminController.markUserAsPaid); 
router.get('/admin/users', adminAuth, adminController.getAllUsers); 
router.delete('/users/:id', adminAuth, adminController.deleteUserById); // ✅ NEW DELETE API
router.get('/online-users', adminController.getOnlineUsers);

// Example of protected route
router.get('/dashboard', adminAuth, (req, res) => {
  res.status(200).json({ message: 'Welcome to Admin Dashboard' });
});

module.exports = router;
