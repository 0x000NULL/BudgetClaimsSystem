const ActivityLog = require('../models/ActivityLog'); // Import the ActivityLog model

// Middleware to log activities
const logActivity = (action) => {
    return (req, res, next) => {
        // Check if the user is authenticated
        if (req.isAuthenticated()) {
            // Create a new activity log entry
            const log = new ActivityLog({
                user: req.user._id, // ID of the authenticated user
                action: action, // Action to be logged
            });

            // Save the activity log entry to the database
            log.save((err) => {
                if (err) console.error('Error logging activity:', err); // Log any errors
            });
        }

        // Proceed to the next middleware or route handler
        next();
    };
};

module.exports = logActivity; // Export the logActivity middleware function
