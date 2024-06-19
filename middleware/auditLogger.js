const AuditLog = require('../models/AuditLog');

const logAction = (action) => {
    return async (req, res, next) => {
        const userId = req.user ? req.user._id : null;
        const details = {
            method: req.method,
            path: req.originalUrl,
            body: req.body,
            params: req.params
        };

        const auditLog = new AuditLog({
            user: userId,
            action,
            details
        });

        try {
            await auditLog.save();
            next();
        } catch (err) {
            console.error('Error saving audit log:', err);
            next(err);
        }
    };
};

module.exports = logAction;
