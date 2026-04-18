const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
  getActiveChallenge,
  getChallengeProgress,
  submitChallengeSection,
  submitChallengeFeedback,
  getChallengeMockQuestions,
  checkAHCPass,
  createChallenge,
  toggleChallengeStatus,
  uploadMockTestCSV,
  getAllChallenges,
  getChallengeResults,
  getChallengeResultSummary,
  getAdminChallengeQuestions,
  resetChallengeSection,
  deleteUserSubmission,
  updateChallenge,
  deleteChallenge,
  updateAccessMode,
  searchUsersForChallenge,
  uploadHindiQuestions,
  getHindiQuestionsCount,
  updateMockQuestion,
} = require('../controllers/challengeController');

const { userProtect } = require('../middleware/userMiddleware');
const adminProtect = require('../middleware/adminMiddleware');

// ===================== USER ROUTES =====================
router.get('/active', userProtect, getActiveChallenge);
router.get('/progress/:userId', userProtect, getChallengeProgress);
router.post('/submit', userProtect, submitChallengeSection);
router.post('/feedback', userProtect, submitChallengeFeedback);
router.get('/mock-questions/:challengeId', userProtect, getChallengeMockQuestions);
router.get('/check-pass/:userId', userProtect, checkAHCPass);

// ===================== ADMIN ROUTES =====================
router.post('/admin/create', adminProtect, createChallenge);
router.put('/admin/update/:challengeId', adminProtect, updateChallenge);
router.patch('/admin/toggle/:challengeId', adminProtect, toggleChallengeStatus);
router.delete('/admin/delete/:challengeId', adminProtect, deleteChallenge);
router.post('/admin/upload-csv', adminProtect, upload.single('file'), uploadMockTestCSV);
router.get('/admin/all', adminProtect, getAllChallenges);
router.get('/admin/questions/:challengeId', adminProtect, getAdminChallengeQuestions);
router.get('/admin/results/:challengeId', adminProtect, getChallengeResults);
router.patch('/admin/reset-section', adminProtect, resetChallengeSection);
router.delete('/admin/delete-submission', adminProtect, deleteUserSubmission);
router.get('/admin/results-summary/:challengeId', adminProtect, getChallengeResultSummary);
router.patch('/admin/access-mode/:challengeId', adminProtect, updateAccessMode);
router.get('/admin/search-users', adminProtect, searchUsersForChallenge);
router.post('/admin/upload-hindi-questions', adminProtect, uploadHindiQuestions);
router.get('/admin/hindi-questions-count/:challengeId', adminProtect, getHindiQuestionsCount);
router.put('/admin/update-question/:questionId', adminProtect, updateMockQuestion);

module.exports = router;
