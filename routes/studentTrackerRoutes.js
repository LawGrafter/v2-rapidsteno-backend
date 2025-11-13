const express = require('express');
const router = express.Router();
const studentTrackerController = require('../controllers/studentTrackerController');
const { protect } = require('../middleware/userAuthMiddleware');

// Topic logs routes
router.post('/topic-logs', protect, studentTrackerController.createTopicLog);
router.get('/topic-logs', protect, studentTrackerController.getTopicLogs);
router.get('/topic-logs/filter/:exam_name/:subject_name', protect, studentTrackerController.getTopicLogs);
router.put('/topic-logs/:id', protect, studentTrackerController.updateTopicLog);
router.delete('/topic-logs/:id', protect, studentTrackerController.deleteTopicLog);

// Exam and subject data routes
router.get('/all-exam-data', protect, studentTrackerController.getAllExamDataWithLogs);
router.get('/exams', protect, studentTrackerController.getAllExams);
router.get('/exams/:exam_name', protect, studentTrackerController.getExamWiseData);
router.get('/exams/:exam_name/subjects/:subject_name', protect, studentTrackerController.getSubjectWiseData);

// Progress summary route
router.get('/progress-summary', protect, studentTrackerController.getProgressSummary);
// Unified progress dashboard route
router.get('/progress-dashboard', protect, studentTrackerController.getProgressDashboard);

// Goal recap route
router.get('/goal-recap', studentTrackerController.getGoalRecap);

module.exports = router;