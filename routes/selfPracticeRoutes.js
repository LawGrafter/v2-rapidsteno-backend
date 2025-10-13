const express = require('express');
const router = express.Router();
const { submitSelfPractice, getAllSelfPracticeSubmissions } = require('../controllers/selfPracticeController');
const { userProtect } = require('../middleware/userMiddleware');
const adminProtect = require('../middleware/adminMiddleware');

router.post('/', userProtect, submitSelfPractice);
router.get('/all', adminProtect, getAllSelfPracticeSubmissions);

module.exports = router;