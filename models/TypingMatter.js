const mongoose = require('mongoose');

const typingMatterSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
        enum: ['legal', 'general'],
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
    }
}, { timestamps: true });

const TypingMatter = mongoose.model('TypingMatter', typingMatterSchema);

module.exports = TypingMatter; 