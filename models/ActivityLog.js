const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for an Activity Log
const ActivityLogSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true // Reference to the user who performed the activity
    },
    action: {
        type: String,
        required: true // Description of the action performed
    },
    timestamp: {
        type: Date,
        default: Date.now // Default to current date and time
    }
});

// Create a model from the schema
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

// Export the model
module.exports = ActivityLog;
