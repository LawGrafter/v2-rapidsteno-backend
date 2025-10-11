const express = require('express');
const router = express.Router();
const { submitSelfPractice } = require('../controllers/selfPracticeController');
const { userProtect } = require('../middleware/userMiddleware');

// Save self-practice submission
router.post('/', userProtect, submitSelfPractice);

module.exports = router;