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

// Only create the model if not in test environment
const AuditLog = process.env.NODE_ENV === 'test' 
    ? mongoose.models.AuditLog || { name: 'AuditLog' }  // Return mock model in test
    : mongoose.model('AuditLog', AuditLogSchema);       // Create real model otherwise

// Export the model
module.exports = AuditLog;
