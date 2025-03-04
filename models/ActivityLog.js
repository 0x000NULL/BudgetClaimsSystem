// models/ActivityLog.js
const mongoose = require('mongoose'); // Import Mongoose for MongoDB interactions

// Define the schema for an Activity Log
const ActivityLogSchema = new mongoose.Schema({
    // Field for the user who performed the action
    user: {
        type: String,
        required: true
    },
    // Field for the action performed by the user
    action: {
        type: String,
        required: true
    },
    // Field for the timestamp of when the action occurred
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Create a model from the schema
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema); // Create a model from the schema

// Export the model
module.exports = ActivityLog;
