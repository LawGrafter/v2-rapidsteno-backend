const express = require('express');
const router = express.Router();
const { 
  sendOtpForRegistration, 
  verifyOtpAndRegister, 
  login, 
  getAllAspirants 
} = require('../controllers/allExamAspirantController');
const adminProtect = require('../middleware/authMiddleware'); // Admin protection for listing users

router.post('/send-otp', sendOtpForRegistration);
router.post('/register', verifyOtpAndRegister);
router.post('/login', login);

// Admin only
router.get('/all', adminProtect, getAllAspirants);

module.exports = router;
