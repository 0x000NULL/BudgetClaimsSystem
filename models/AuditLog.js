// models/AuditLog.js
const mongoose = require('mongoose'); // Import Mongoose to create a schema

/**
 * AuditLog Schema - Records user actions for audit purposes
 * @module models/AuditLog
 */
const AuditLogSchema = new mongoose.Schema({
    // Field for the user who performed the action
    user: {
        type: String, // Changed from ObjectId to String to avoid issues
        required: true // This field is required
    },
    // Field for the action performed
    action: {
        type: String, // Data type is String
        required: true, // This field is required
        trim: true // Remove whitespace
    },
    // Field for additional details about the action
    details: {
        type: String, // Data type is String
        default: '' // Default value is an empty string
    },
    // Field for when the action was performed
    timestamp: {
        type: Date, // Data type is Date
        default: Date.now // Default value is the current date/time
    }
});

// Create the model from the schema
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// Export the model
module.exports = AuditLog;
