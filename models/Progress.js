const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        enum: ['export'] // Add other types if needed
    },
    status: {
        type: String,
        required: true,
        enum: ['started', 'completed', 'failed'],
        default: 'started'
    },
    total: {
        type: Number,
        default: 0
    },
    completed: {
        type: Number,
        default: 0
    },
    error: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // Documents will be automatically deleted after 24 hours
    }
});

module.exports = mongoose.model('Progress', progressSchema); 