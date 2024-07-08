// Import necessary modules
const express = require('express'); // Import Express to create a router
const router = express.Router(); // Create a new router
const AuditLog = require('../models/AuditLog'); // Import the AuditLog model to interact with the audit logs collection in MongoDB
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware

// Route to get and display audit logs
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        // Fetch audit logs from the database, populate the 'user' field with the username, sort by timestamp in descending order, and convert to plain JavaScript objects
        const logs = await AuditLog.find().populate('user', 'username').sort({ timestamp: -1 }).lean();
        console.log('Audit logs fetched:', logs); // Log the fetched audit logs for debugging purposes

        // Render the 'audit_logs' view and pass the fetched logs
        res.render('audit_logs', { logs });
    } catch (err) {
        // Log any errors that occur during the fetching of audit logs
        console.error('Error fetching audit logs:', err);

        // Send a 500 status code and an error message if an error occurs
        res.status(500).send('Server Error');
    }
});

module.exports = router; // Export the router
