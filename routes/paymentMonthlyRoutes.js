const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentMonthlyController');

router.post('/create', paymentController.createPayment);
router.get('/status', paymentController.verifyPayment);
router.get('/user/:userId', paymentController.getUserPayments);
router.get('/admin', paymentController.getAllPayments); // Protect this in production

module.exports = router;
