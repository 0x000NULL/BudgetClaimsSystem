// middleware/auditLogger.js
const AuditLog = require('../models/AuditLog');

const logActivity = (action) => {
    return async (req, res, next) => {
        try {
            const auditLog = new AuditLog({
                user: req.user._id,
                action,
                details: JSON.stringify(req.body)
            });
            await auditLog.save();
        } catch (err) {
            console.error('Error logging activity:', err);
        }
        next();
    };
};

module.exports = logActivity;
