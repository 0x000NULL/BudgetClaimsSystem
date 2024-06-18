const ActivityLog = require('../models/ActivityLog');

// Middleware to log activities
const logActivity = (action) => {
    return (req, res, next) => {
        if (req.isAuthenticated()) {
            const log = new ActivityLog({
                user: req.user._id,
                action: action,
            });
            log.save((err) => {
                if (err) console.error('Error logging activity:', err);
            });
        }
        next();
    };
};

module.exports = logActivity;
