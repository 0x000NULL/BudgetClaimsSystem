// routes/auditLogs.js

const express = require('express');
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog'); // Import the AuditLog model
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication middleware

const router = express.Router();

// Route to fetch and display audit logs
router.get('/', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    console.log('Audit Logs route accessed');
    try {
        const auditLogs = await AuditLog.find().populate('user').exec(); // Fetch audit logs with user details
        console.log('Audit logs fetched:', auditLogs);
        res.render('audit_logs', { title: 'Audit Logs', auditLogs });
    } catch (err) {
        console.error('Error fetching audit logs:', err.message);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

module.exports = router;
