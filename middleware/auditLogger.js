// middleware/auditLogger.js
const AuditLog = require('../models/AuditLog'); // Import the AuditLog model to interact with the auditLogs collection in MongoDB

/**
 * Middleware to log user activity
 * @param {string} action - The action performed by the user
 * @returns {Function} - Middleware function to log activity
 */
const logActivity = (action) => {
    return async (req, res, next) => { // Return an asynchronous middleware function
        try {
            // Create a new audit log entry
            const auditLog = new AuditLog({
                user: req.user._id, // The ID of the authenticated user performing the action
                action, // The action being logged
                details: JSON.stringify(req.body) // The details of the request body, converted to a JSON string
            });
            // Save the audit log entry to the database
            await auditLog.save();
        } catch (err) {
            // Log any errors that occur while saving the audit log entry
            console.error('Error logging activity:', err);
        }
        next(); // Proceed to the next middleware or route handler
    };
};

// Export the logActivity middleware
module.exports = logActivity;
