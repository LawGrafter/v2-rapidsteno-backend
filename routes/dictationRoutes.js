const express = require('express');
const router = express.Router();

const dictationController = require('../controllers/dictationController');
const authMiddleware = require('../middleware/authMiddleware');

// POST dictation (upload mp3 + data)
router.post('/upload', dictationController.uploadDictation);

router.get('/get', dictationController.getAllDictations);
router.get('/audio/:id', dictationController.getAudioById);
router.get('/getbyid/:id', dictationController.getDictationById);
router.put('/update/:id', dictationController.updateDictation);
router.delete('/delete/:id', dictationController.deleteDictation);

module.exports = router;
