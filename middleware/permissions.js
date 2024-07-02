// middleware/permissions.js

const permissionsConfig = require('../config/permissions');

const checkPermissions = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.status(401).send('Unauthorized');
        }

        const userPermissions = req.user.permissions || {};
        const hasPermission = requiredPermissions.every(permission => userPermissions[permission]);

        if (!hasPermission) {
            return res.status(403).send('Forbidden');
        }

        next();
    };
};

module.exports = checkPermissions;
