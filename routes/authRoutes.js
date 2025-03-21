const express = require('express');
const { register, login, updateUserStatus } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login); // New login route
router.patch('/update-status', updateUserStatus);

module.exports = router;
