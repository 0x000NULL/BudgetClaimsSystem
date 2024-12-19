const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    exportId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: ['export']
    },
    status: {
        type: String,
        required: true,
        enum: ['started', 'in_progress', 'completed', 'failed'],
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

progressSchema.pre('save', async function(next) {
    try {
        await this.collection.dropIndexes();
    } catch (error) {
        console.log('Error dropping indexes:', error);
    }
    next();
});

const Progress = mongoose.model('Progress', progressSchema);

Progress.createIndexes().catch(console.error);

module.exports = Progress; 