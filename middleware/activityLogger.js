const ActivityLog = require('../models/ActivityLog'); // Import the ActivityLog model
const pinoLogger = require('../logger'); // Import Pino logger

/**
 * Middleware to log user activities
 * @param {string} action - The action performed by the user
 * @returns {Function} - Middleware function to log activity
 */
const logActivity = (action) => {
    return async (req, res, next) => { // Return a middleware function
        // Log that the middleware has been called
        pinoLogger.info({
            message: 'logActivity middleware called',
            action,
            user: req.user ? req.user.email : 'Unauthenticated', // Log user if available
            ip: req.ip, // Log IP address
            sessionId: req.sessionID, // Log session ID
            timestamp: new Date().toISOString() // Add a timestamp
        });

        // Check if the user is authenticated
        if (req.isAuthenticated()) {
            // Create a new activity log entry
            const log = new ActivityLog({
                user: req.user._id, // The ID of the authenticated user performing the action
                action: action, // The action being logged
            });

            // Save the activity log entry to the database
            try {
                await log.save();
                // Log success message if the activity log entry was saved successfully
                pinoLogger.info({
                    message: 'Activity log saved successfully',
                    action,
                    user: req.user.email,
                    ip: req.ip,
                    sessionId: req.sessionID,
                    timestamp: new Date().toISOString()
                });
            } catch (err) {
                // Log any errors that occur while saving the activity log entry
                pinoLogger.error({
                    message: 'Error logging activity',
                    error: err.message,
                    action,
                    user: req.user.email,
                    ip: req.ip,
                    sessionId: req.sessionID,
                    timestamp: new Date().toISOString()
                });
                next(err);
                return;
            }
        } else {
            // Log that the user is not authenticated
            pinoLogger.warn({
                message: 'User not authenticated, activity not logged',
                action,
                ip: req.ip,
                sessionId: req.sessionID,
                timestamp: new Date().toISOString()
            });
        }

        // Proceed to the next middleware or route handler
        next(); // Call the next function in the request-response cycle
    };
};

// Export the logActivity middleware function
module.exports = logActivity;
