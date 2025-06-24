const express = require('express');
const router = express.Router();

const dictationController = require('../controllers/dictationController');
const { userProtect } = require("../middleware/userMiddleware");
const adminProtect = require("../middleware/authMiddleware");


// POST dictation (upload mp3 + data)
router.post('/upload', dictationController.uploadDictation);

router.get('/get', userProtect, dictationController.getAllDictations);

// ✅ Admin route: requires only admin token
router.get('/admin/get', adminProtect, dictationController.getAllDictations);


router.get('/audio/:id', userProtect, dictationController.getAudioById);
router.get('/getbyid/:id', adminProtect, dictationController.getDictationById);
router.put('/update/:id', adminProtect, dictationController.updateDictation);
router.delete('/delete/:id', adminProtect, dictationController.deleteDictation);

router.delete('/delete/:id', adminProtect, dictationController.deleteDictation);

module.exports = router;
