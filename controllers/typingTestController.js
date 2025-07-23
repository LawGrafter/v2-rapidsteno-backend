const TypingMatter = require('../models/TypingMatter');
const TypingRecord = require('../models/TypingRecord');
const User = require('../models/userModel');

// @desc    Get typing matter by category
// @route   GET /api/typing-test/matter
// @access  Public
const getTypingMatter = async (req, res) => {
    try {
        const { category } = req.query;
        const query = category ? { category } : {};
        const matters = await TypingMatter.find(query);
        res.json(matters);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Submit a typing test record
// @route   POST /api/typing-test/record
// @access  Private
// const submitTypingRecord = async (req, res) => {
//     try {
//         if (!req.user || !req.user.id) {
//             return res.status(401).json({ message: 'Authentication error: User information is missing from the request. Please ensure you are logged in and sending the correct authentication headers.' });
//         }

//         const { matterId, wpm: netWpm, accuracy, timeTaken, errors, typedContent } = req.body;
//         const userId = req.user.id;

//         // const typedWords = typedContent.split(/\s+/).length;
//         // const grossWpm = (typedWords / 5) / (timeTaken / 60);

//         const newRecord = new TypingRecord({
//             user: userId,
//             matter: matterId,
//             wpm: netWpm, // For backward compatibility
//             netWpm,
//             grossWpm,
//             accuracy,
//             timeTaken,
//             errors,
//             typedContent
//         });

//         const record = await newRecord.save();
//         res.status(201).json(record);
//     } catch (error) {
//         if (error.name === 'ValidationError') {
//             return res.status(400).json({ message: 'Validation failed', errors: error.errors });
//         }
//         res.status(500).json({ message: 'Server error' });
//     }
// };


const submitTypingRecord = async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Authentication error: User information is missing' });
      }
  
      const {
        matterId,
        wpm: netWpm,
        grossWpm, // ✅ use directly
        accuracy,
        timeTaken,
        errors,
        typedContent
      } = req.body;
  
      const userId = req.user.id;
  
      const newRecord = new TypingRecord({
        user: userId,
        matter: matterId,
        wpm: netWpm,
        netWpm,
        grossWpm, // ✅ now from frontend
        accuracy,
        timeTaken,
        errors,
        typedContent
      });
  
      const record = await newRecord.save();
      res.status(201).json(record);
    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation failed', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  };
  
// @desc    Get user typing analytics
// @route   GET /api/typing-test/analytics/:userId
// @access  Private
const getTypingAnalytics = async (req, res) => {
    try {
        const userId = req.params.userId;
        const records = await TypingRecord.find({ user: userId }).populate('matter', 'title category difficulty');

        if (!records) {
            return res.status(404).json({ message: 'No records found for this user.' });
        }

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create new typing matter by Admin
// @route   POST /api/admin/typing-matter
// @access  Private/Admin
const createTypingMatter = async (req, res) => {
    try {
        const { title, content, category, difficulty } = req.body;

        const newMatter = new TypingMatter({
            title,
            content,
            category,
            difficulty,
        });

        const savedMatter = await newMatter.save();
        res.status(201).json(savedMatter);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update typing matter by Admin
// @route   PUT /api/admin/typing-matter/:id
// @access  Private/Admin
const updateTypingMatter = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category, difficulty } = req.body;

        const updatedMatter = await TypingMatter.findByIdAndUpdate(
            id,
            { title, content, category, difficulty },
            { new: true, runValidators: true }
        );

        if (!updatedMatter) {
            return res.status(404).json({ message: 'Typing matter not found' });
        }

        res.json(updatedMatter);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete typing matter by Admin
// @route   DELETE /api/admin/typing-matter/:id
// @access  Private/Admin
const deleteTypingMatter = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedMatter = await TypingMatter.findByIdAndDelete(id);

        if (!deletedMatter) {
            return res.status(404).json({ message: 'Typing matter not found' });
        }

        res.json({ message: 'Typing matter removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getTypingMatter,
    submitTypingRecord,
    getTypingAnalytics,
    createTypingMatter,
    updateTypingMatter,
    deleteTypingMatter,
}; 