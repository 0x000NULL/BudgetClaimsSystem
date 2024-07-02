// routes/userManagement.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const checkPermissions = require('../middleware/checkPermissions');
const permissions = require('../config/permissions');

// ... other routes

router.get('/modify-roles', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    try {
        const users = await User.find({}, 'username role').lean();
        res.render('modify_roles', { users });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/modify-roles', ensureAuthenticated, checkPermissions([permissions.USERS.UPDATE]), async (req, res) => {
    const { username, role } = req.body;
    const rolePermissions = assignRolePermissions(role);
    try {
        await User.findOneAndUpdate({ username }, { role, permissions: rolePermissions });
        res.status(200).send('User role updated');
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
