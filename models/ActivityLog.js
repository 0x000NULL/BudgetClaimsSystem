// models/ActivityLog.js
const mongoose = require('mongoose'); // Import Mongoose for MongoDB interactions
const Schema = mongoose.Schema; // Define the Schema constructor

// Define the schema for an Activity Log
const ActivityLogSchema = new Schema({
    // Field for the user who performed the action
    user: {
        type: Schema.Types.ObjectId, // Reference type to another document (User)
        ref: 'User', // The model to reference
        required: true // The user field is required
    },
    // Field for the action performed by the user
    action: {
        type: String, // The action performed by the user
        required: true // The action field is required
    },
    // Field for the timestamp of when the action occurred
    timestamp: {
        type: Date, // The timestamp of when the action occurred
        default: Date.now // Default to the current date and time
    }
});

// Create a model from the schema
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema); // Create a model from the schema

// Export the model
module.exports = ActivityLog;
