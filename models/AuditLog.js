// models/AuditLog.js
const mongoose = require('mongoose'); // Import Mongoose to interact with MongoDB

// Define the schema for an Audit Log
const AuditLogSchema = new mongoose.Schema({
    // Field for the user who performed the action
    user: {
        type: mongoose.Schema.Types.ObjectId, // Data type is ObjectId
        ref: 'User', // Reference to the User model
        required: true // This field is required
    },
    // Field for the action performed
    action: {
        type: String, // Data type is String
        required: true // This field is required
    },
    // Field for additional details about the action
    details: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the timestamp of when the action was performed
    timestamp: {
        type: Date, // Data type is Date
        default: Date.now // Default value is the current date
    }
});

// Create a model from the schema
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// Export the model
module.exports = AuditLog;
