const AuditLog = require('../models/AuditLog'); // Import the AuditLog model to interact with the auditLogs collection in MongoDB
const pinoLogger = require('../logger'); // Import Pino logger

/**
 * Middleware to log user activity
 * @param {string} action - The action performed by the user
 * @returns {Function} - Middleware function to log activity
 */
const logActivity = (action) => {
    return async (req, res, next) => { // Return an asynchronous middleware function
        try {
            pinoLogger.info({
                message: 'Logging user activity',
                action, // The action being logged
                user: req.user ? req.user.email : 'Unauthenticated', // Log user if available
                ip: req.ip, // Log IP address
                sessionId: req.sessionID, // Log session ID
                requestBody: req.body, // Log request body
                timestamp: new Date().toISOString() // Add a timestamp
            });

            // Create a new audit log entry
            const auditLog = new AuditLog({
                user: req.user._id, // The ID of the authenticated user performing the action
                action, // The action being logged
                details: JSON.stringify(req.body) // The details of the request body, converted to a JSON string
            });

            // Save the audit log entry to the database
            await auditLog.save();
            pinoLogger.info({
                message: 'Audit log saved successfully',
                action,
                user: req.user ? req.user.email : 'Unauthenticated',
                ip: req.ip,
                sessionId: req.sessionID,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            // Log any errors that occur while saving the audit log entry
            pinoLogger.error({
                message: 'Error logging activity',
                error: err.message,
                action,
                user: req.user ? req.user.email : 'Unauthenticated',
                ip: req.ip,
                sessionId: req.sessionID,
                timestamp: new Date().toISOString()
            });
        }
        next(); // Proceed to the next middleware or route handler
    };
};

// Export the logActivity middleware
module.exports = logActivity;
