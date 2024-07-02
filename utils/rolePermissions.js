// utils/rolePermissions.js

const permissions = require('../config/permissions');

const rolePermissions = {
    admin: [
        permissions.CLAIMS.CREATE,
        permissions.CLAIMS.READ,
        permissions.CLAIMS.UPDATE,
        permissions.CLAIMS.DELETE,
        permissions.USERS.CREATE,
        permissions.USERS.READ,
        permissions.USERS.UPDATE,
        permissions.USERS.DELETE
    ],
    manager: [
        permissions.CLAIMS.READ,
        permissions.CLAIMS.UPDATE,
        permissions.USERS.READ
    ],
    employee: [
        permissions.CLAIMS.READ,
        permissions.CLAIMS.CREATE
    ]
};

const assignRolePermissions = (role) => {
    return rolePermissions[role] || [];
};

module.exports = assignRolePermissions;
