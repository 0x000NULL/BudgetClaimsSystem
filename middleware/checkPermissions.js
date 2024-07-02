// middleware/checkPermissions.js
const permissionsConfig = require('../config/permissions');

const checkPermissions = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            return res.status(403).send('Access Denied');
        }

        const userPermissions = req.user.permissions;
        const hasPermission = requiredPermissions.every(permission => userPermissions.includes(permission));

        if (!hasPermission) {
            return res.status(403).send('Access Denied');
        }

        next();
    };
};

module.exports = checkPermissions;
