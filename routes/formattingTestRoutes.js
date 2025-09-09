const express = require('express');
const router = express.Router();
const { createFormattingResult, getMyFormattingResults, getAllFormattingResults, getFormattingResultsGroupedByUser } = require('../controllers/formattingTestController');
const { userProtect } = require('../middleware/userMiddleware');
const adminProtect = require('../middleware/adminMiddleware');

// User endpoints
router.post('/result', userProtect, createFormattingResult);
router.get('/my-results', userProtect, getMyFormattingResults);

// Admin endpoint
router.get('/all', adminProtect, getAllFormattingResults);
router.get('/admin/users', adminProtect, getFormattingResultsGroupedByUser);

module.exports = router;
