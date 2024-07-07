const ActivityLog = require('../models/ActivityLog'); // Import the ActivityLog model

/**
 * Middleware to log user activities
 * @param {string} action - The action performed by the user
 * @returns {Function} - Middleware function to log activity
 */
const logActivity = (action) => {
    return (req, res, next) => { // Return a middleware function
        // Check if the user is authenticated
        if (req.isAuthenticated()) {
            // Create a new activity log entry
            const log = new ActivityLog({
                user: req.user._id, // The ID of the authenticated user performing the action
                action: action, // The action being logged
            });

            // Save the activity log entry to the database
            log.save((err) => {
                if (err) {
                    // Log any errors that occur while saving the activity log entry
                    console.error('Error logging activity:', err);
                }
            });
        }

        // Proceed to the next middleware or route handler
        next(); // Call the next function in the request-response cycle
    };
};

// Export the logActivity middleware function
module.exports = logActivity;
