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

// 🎧 Admin route to get audio
router.get('/admin/audio/:id', adminProtect, dictationController.getAudioById);

router.get('/audio/:id', userProtect, dictationController.getAudioById);

// 📦 Bulk download all audio files as ZIP
router.get('/download/all-audio', adminProtect, dictationController.downloadAllAudio);

router.get('/getbyid/:id', adminProtect, dictationController.getDictationById);
router.put('/update/:id', adminProtect, dictationController.updateDictation);
router.delete('/delete/:id', adminProtect, dictationController.deleteDictation);

// ✅ Admin: Bulk fix capitalization after full stops
router.post('/admin/fix-capitalization', adminProtect, dictationController.bulkFixCapitalization);

// ✅ Admin: Bulk fix court capitalization
router.post('/admin/fix-court', adminProtect, dictationController.bulkFixCourt);

module.exports = router;
