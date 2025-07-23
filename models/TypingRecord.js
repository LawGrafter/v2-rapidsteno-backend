const mongoose = require('mongoose');

const typingRecordSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    matter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TypingMatter',
        required: true,
    },
    wpm: {
        type: Number,
        required: true,
    },
    netWpm: {
        type: Number,
    },
    grossWpm: {
        type: Number,
    },
    accuracy: {
        type: Number,
        required: true,
    },
    timeTaken: { // in seconds
        type: Number,
        required: true,
    },
    errors: {
        type: Number,
        required: true,
    },
    typedContent: {
        type: String,
    }
}, { timestamps: true });

const TypingRecord = mongoose.model('TypingRecord', typingRecordSchema);

module.exports = TypingRecord; 