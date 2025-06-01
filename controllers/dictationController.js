// const mongoose = require('mongoose');
// const Dictation = require('../models/Dictation');
// const multer = require('multer');
// const { GridFSBucket } = require('mongodb');
// const fs = require('fs');
// const path = require('path');
// const os = require('os');

// // Configure multer to temporarily store files
// const upload = multer({
//   dest: os.tmpdir(),
//   limits: { fileSize: 20 * 1024 * 1024 }, // Limit to 20MB
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
//       cb(null, true);
//     } else {
//       cb(new Error('Only mp3 files are allowed'));
//     }
//   },
// }).single('fileupload');

// exports.uploadDictation = (req, res) => {
//   upload(req, res, async (uploadErr) => {
//     if (uploadErr) {
//       return res.status(400).json({ success: false, message: uploadErr.message });
//     }

//     if (!req.file) {
//       return res.status(400).json({ success: false, message: 'MP3 file is required' });
//     }

//     const { paragraphText, totalwords, speed } = req.body;

//     if (!paragraphText || !totalwords || !speed) {
//       fs.unlinkSync(req.file.path); // Clean up temp file
//       return res.status(400).json({ success: false, message: 'All fields are required' });
//     }

//     try {
//       const db = mongoose.connection.db;
//       const bucket = new GridFSBucket(db, {
//         bucketName: 'dictationFiles',
//       });

//       const uploadStream = bucket.openUploadStream(path.basename(req.file.originalname));
//       const fileStream = fs.createReadStream(req.file.path);

//       fileStream.pipe(uploadStream)
//         .on('error', (error) => {
//           fs.unlinkSync(req.file.path);
//           return res.status(500).json({ success: false, message: 'Error saving file to GridFS', error: error.message });
//         })
//         .on('finish', async () => {
//           fs.unlinkSync(req.file.path); // Clean up temp file

//           // Save metadata to Dictation collection
//           const dictation = new Dictation({
//             fileupload: uploadStream.id, // Store GridFS file ID
//             paragraphText,
//             totalwords: Number(totalwords),
//             speed: Number(speed),
//           });

//           await dictation.save();

//           return res.status(201).json({ success: true, data: dictation });
//         });

//     } catch (err) {
//       fs.unlinkSync(req.file.path);
//       return res.status(500).json({ success: false, message: 'Server error', error: err.message });
//     }
//   });
// };


// exports.getAllDictations = async (req, res) => {
//   try {
//     const dictations = await Dictation.find().sort({ createdAt: -1 });
//     res.status(200).json({ success: true, data: dictations });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Failed to fetch dictations', error: err.message });
//   }
// };


// exports.getDictationById = async (req, res) => {
//   try {
//     const dictation = await Dictation.findById(req.params.id);
//     if (!dictation) return res.status(404).json({ success: false, message: 'Dictation not found' });
//     res.status(200).json({ success: true, data: dictation });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Failed to fetch dictation', error: err.message });
//   }
// };


// exports.updateDictation = async (req, res) => {
//   try {
//     const { paragraphText, totalwords, speed } = req.body;
//     const updateFields = { paragraphText, totalwords, speed };

//     const dictation = await Dictation.findByIdAndUpdate(req.params.id, updateFields, { new: true });

//     if (!dictation) return res.status(404).json({ success: false, message: 'Dictation not found' });

//     res.status(200).json({ success: true, data: dictation });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Failed to update dictation', error: err.message });
//   }
// };

// exports.deleteDictation = async (req, res) => {
//   try {
//     const dictation = await Dictation.findById(req.params.id);
//     if (!dictation) {
//       return res.status(404).json({ success: false, message: 'Dictation not found' });
//     }

//     const db = mongoose.connection.db;
//     const bucket = new GridFSBucket(db, { bucketName: 'dictationFiles' });

//     try {
//       // Validate and convert file ID to ObjectId
//       const fileId = new ObjectId(dictation.fileupload);

//       // Wrap the delete call in a promise
//       await new Promise((resolve, reject) => {
//         bucket.delete(fileId, (err) => {
//           if (err) return reject(err);
//           resolve();
//         });
//       });
//     } catch (gridfsErr) {
//       // File might already be missing, just log and continue
//       console.warn('⚠️ GridFS file not found or delete failed:', gridfsErr.message);
//     }

//     // Delete the metadata document
//     await Dictation.findByIdAndDelete(req.params.id);

//     return res.status(200).json({ success: true, message: 'Dictation deleted successfully' });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: 'Failed to delete dictation', error: err.message });
//   }
// };

const mongoose = require('mongoose');
const Dictation = require('../models/Dictation');
const multer = require('multer');
const { GridFSBucket, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Multer Config
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
      cb(null, true);
    } else {
      cb(new Error('Only mp3 files are allowed'));
    }
  },
}).single('fileupload');

// Upload New Dictation
exports.uploadDictation = (req, res) => {
  upload(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ success: false, message: uploadErr.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'MP3 file is required' });
    }

    const { title, category, paragraphText, totalwords, speed } = req.body;

    if (!title || !category || !paragraphText || !totalwords || !speed) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    try {
      const db = mongoose.connection.db;
      const bucket = new GridFSBucket(db, { bucketName: 'dictationFiles' });

      const uploadStream = bucket.openUploadStream(path.basename(req.file.originalname));
      const fileStream = fs.createReadStream(req.file.path);

      fileStream.pipe(uploadStream)
        .on('error', (error) => {
          fs.unlinkSync(req.file.path);
          return res.status(500).json({ success: false, message: 'Error saving file to GridFS', error: error.message });
        })
        .on('finish', async () => {
          fs.unlinkSync(req.file.path);

          const dictation = new Dictation({
            fileupload: uploadStream.id,
            title,
            category,
            paragraphText,
            totalwords: Number(totalwords),
            speed: Number(speed),
          });

          await dictation.save();

          return res.status(201).json({ success: true, data: dictation });
        });

    } catch (err) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
  });
};

// Get All Dictations
exports.getAllDictations = async (req, res) => {
  try {
    const dictations = await Dictation.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: dictations });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch dictations', error: err.message });
  }
};

// Get Dictation by ID
exports.getDictationById = async (req, res) => {
  try {
    const dictation = await Dictation.findById(req.params.id);
    if (!dictation) return res.status(404).json({ success: false, message: 'Dictation not found' });

    res.status(200).json({ success: true, data: dictation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch dictation', error: err.message });
  }
};

// Update Dictation
// exports.updateDictation = async (req, res) => {
//   try {
//     const { title, category, paragraphText, totalwords, speed } = req.body;

//     const updateFields = { title, category, paragraphText, totalwords, speed };

//     const dictation = await Dictation.findByIdAndUpdate(req.params.id, updateFields, { new: true });

//     if (!dictation) return res.status(404).json({ success: false, message: 'Dictation not found' });

//     res.status(200).json({ success: true, data: dictation });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Failed to update dictation', error: err.message });
//   }
// };

exports.updateDictation = (req, res) => {
  upload(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ success: false, message: uploadErr.message });
    }

    const { title, category, paragraphText, totalwords, speed } = req.body;
    const updateFields = { title, category, paragraphText, totalwords, speed };

    try {
      if (req.file) {
        // Upload new file to GridFS
        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'dictationFiles' });

        const uploadStream = bucket.openUploadStream(path.basename(req.file.originalname));
        const fileStream = fs.createReadStream(req.file.path);

        fileStream.pipe(uploadStream)
          .on('error', (error) => {
            fs.unlinkSync(req.file.path);
            return res.status(500).json({ success: false, message: 'Error saving file', error: error.message });
          })
          .on('finish', async () => {
            fs.unlinkSync(req.file.path);
            updateFields.fileupload = uploadStream.id;

            const updated = await Dictation.findByIdAndUpdate(req.params.id, updateFields, { new: true });

            if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
            res.status(200).json({ success: true, data: updated });
          });
      } else {
        const updated = await Dictation.findByIdAndUpdate(req.params.id, updateFields, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
        res.status(200).json({ success: true, data: updated });
      }
    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ success: false, message: 'Update failed', error: err.message });
    }
  });
};


// Delete Dictation
exports.deleteDictation = async (req, res) => {
  try {
    const dictation = await Dictation.findById(req.params.id);
    if (!dictation) {
      return res.status(404).json({ success: false, message: 'Dictation not found' });
    }

    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'dictationFiles' });

    try {
      const fileId = new ObjectId(dictation.fileupload);

      await new Promise((resolve, reject) => {
        bucket.delete(fileId, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    } catch (gridfsErr) {
      console.warn('⚠️ GridFS file not found or delete failed:', gridfsErr.message);
    }

    await Dictation.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: 'Dictation deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete dictation', error: err.message });
  }
};


exports.getAudioById = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'dictationFiles' });
    const fileId = new ObjectId(req.params.id);

    const downloadStream = bucket.openDownloadStream(fileId);

    res.set('Content-Type', 'audio/mpeg');
    downloadStream.pipe(res);

    downloadStream.on('error', () => {
      res.status(404).json({ success: false, message: 'Audio not found' });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
