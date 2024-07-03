// routes/auditLogs.js
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');

router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        const logs = await AuditLog.find().populate('user', 'username').sort({ timestamp: -1 }).lean();
        console.log('Audit logs fetched:', logs); // Logs should print here
        res.render('audit_logs', { logs });
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
