const TestRecording = require('../models/TestRecording');

// Save or update test recording (replaces previous one for same user)
exports.saveTestRecording = async (req, res) => {
  try {
    const userId = req.user.id;
    const { template, font, fontSize, capsLock, startTime, endTime, actions, snapshots, finalSubmission, mistakes, score, testDuration } = req.body;

    console.log('Saving test recording for user:', userId);
    console.log('Template:', template, 'StartTime:', startTime);

    // Delete previous recording for this user
    await TestRecording.deleteMany({ userId });

    // Create new recording
    const recording = new TestRecording({
      userId,
      template: template || 'default',
      font,
      fontSize,
      capsLock,
      startTime,
      endTime,
      actions,
      snapshots,
      finalSubmission,
      mistakes,
      score,
      testDuration
    });

    await recording.save();

    res.status(201).json({
      success: true,
      message: 'Test recording saved successfully',
      recordingId: recording._id
    });
  } catch (error) {
    console.error('Error saving test recording:', error);
    console.error('Error details:', error.message);
    console.error('Validation errors:', error.errors);
    res.status(500).json({
      success: false,
      message: 'Failed to save test recording',
      error: error.message,
      details: error.errors
    });
  }
};

// Get all test recordings (admin only)
exports.getAllRecordings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const recordings = await TestRecording.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await TestRecording.countDocuments();

    res.json({
      success: true,
      recordings,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recordings',
      error: error.message
    });
  }
};

// Get single recording by ID
exports.getRecordingById = async (req, res) => {
  try {
    const recording = await TestRecording.findById(req.params.id)
      .populate('userId', 'name email')
      .lean();

    if (!recording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    res.json({
      success: true,
      recording
    });
  } catch (error) {
    console.error('Error fetching recording:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recording',
      error: error.message
    });
  }
};

// Get user's latest recording
exports.getUserLatestRecording = async (req, res) => {
  try {
    // If userId is in params (admin route), use that; otherwise use logged-in user
    const userId = req.params.userId || req.user.id;

    const recording = await TestRecording.findOne({ userId })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    if (!recording) {
      return res.status(404).json({
        success: false,
        message: 'No recording found'
      });
    }

    res.json({
      success: true,
      recording
    });
  } catch (error) {
    console.error('Error fetching user recording:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recording',
      error: error.message
    });
  }
};

// Delete recording
exports.deleteRecording = async (req, res) => {
  try {
    const recording = await TestRecording.findByIdAndDelete(req.params.id);

    if (!recording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    res.json({
      success: true,
      message: 'Recording deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete recording',
      error: error.message
    });
  }
};
