const express = require('express');
const router = express.Router();
const controller = require('../controllers/pitmanExerciseController');

router.post('/', controller.createExercise);
router.get('/', controller.getAllExercises);
router.get('/:id', controller.getExerciseById);
router.put('/:id', controller.updateExercise);
router.delete('/:id', controller.deleteExercise);

module.exports = router;
