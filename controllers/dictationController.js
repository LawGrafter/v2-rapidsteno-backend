const mongoose = require('mongoose');
const Dictation = require('../models/Dictation');
const multer = require('multer');
const { GridFSBucket, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const os = require('os');
const archiver = require('archiver');

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

    const { title, category, paragraphText, totalwords, speed, withPunctuation } = req.body;

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
            withPunctuation: withPunctuation === 'true' || withPunctuation === true, 
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
    const { category } = req.query;
    const filter = {};
    if (category) {
      filter.category = category;
    }
    const dictations = await Dictation.find(filter).sort({ createdAt: -1 });
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

    const { title, category, paragraphText, totalwords, speed, withPunctuation } = req.body;
    const updateFields = { title, category, paragraphText, totalwords, speed,   withPunctuation: withPunctuation === 'true' || withPunctuation === true };

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

// Bulk Download All Dictation Audio Files
exports.downloadAllAudio = async (req, res) => {
  try {
    const { category } = req.query;
    
    // Build filter for dictations
    const filter = {};
    if (category) {
      filter.category = category;
    }

    // Get all dictations
    const dictations = await Dictation.find(filter).select('fileupload title category speed');
    
    if (dictations.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No dictations found' 
      });
    }

    // Set response headers for ZIP download
    const zipFileName = category ? `dictations_${category}_${Date.now()}.zip` : `all_dictations_${Date.now()}.zip`;
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipFileName}"`,
      'Transfer-Encoding': 'chunked'
    });

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 1 } // Fastest compression for audio files
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          message: 'Error creating archive', 
          error: err.message 
        });
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // Setup GridFS bucket
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'dictationFiles' });

    // Process each dictation
    let processedCount = 0;
    let skippedCount = 0;
    const totalCount = dictations.length;

    for (const dictation of dictations) {
      try {
        // Create safe filename
        const safeTitle = dictation.title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
        const fileName = `${safeTitle}_${dictation.speed}wpm_${dictation.category}.mp3`;

        // Check if file exists in GridFS before trying to download
        const fileExists = await bucket.find({ _id: new ObjectId(dictation.fileupload) }).hasNext();
        
        if (!fileExists) {
          console.warn(`Skipping missing file: ${fileName} (ID: ${dictation.fileupload})`);
          skippedCount++;
          continue;
        }

        // Get audio stream from GridFS
        const downloadStream = bucket.openDownloadStream(new ObjectId(dictation.fileupload));
        
        // Handle stream errors to prevent crashes
        downloadStream.on('error', (streamError) => {
          console.error(`Stream error for ${fileName}:`, streamError.message);
          skippedCount++;
        });
        
        // Add file to archive
        archive.append(downloadStream, { name: fileName });

        processedCount++;
        console.log(`Added to archive: ${fileName} (${processedCount}/${totalCount})`);

      } catch (fileError) {
        console.error(`Error processing dictation ${dictation._id}:`, fileError.message);
        skippedCount++;
        // Continue with other files even if one fails
        continue;
      }
    }

    console.log(`Processing complete: ${processedCount} files added, ${skippedCount} files skipped`);

    // Finalize the archive
    await archive.finalize();
    
    console.log(`Successfully created ZIP with ${processedCount} audio files`);

  } catch (err) {
    console.error('Bulk download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Server error during bulk download', 
        error: err.message 
      });
    }
  }
};
