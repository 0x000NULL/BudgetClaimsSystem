/**
 * @fileoverview This file defines the routes for handling audit logs in the Budget Claims System.
 * It includes a route to fetch and display audit logs, with authentication and role-checking middleware.
 * 
 * @module routes/auditLogs
 */

/**
 * Route to get and display audit logs.
 * 
 * @name get/
 * @function
 * @memberof module:routes/auditLogs
 * @inner
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @throws Will throw an error if there is an issue fetching audit logs from the database.
 * @middleware ensureAuthenticated - Middleware to ensure the user is authenticated.
 * @middleware ensureRoles - Middleware to ensure the user has the required roles ('admin' or 'manager').
 */
// Import necessary modules
const express = require('express'); // Import Express to create a router
const router = express.Router(); // Create a new router
const AuditLog = require('../models/AuditLog'); // Import the AuditLog model to interact with the audit logs collection in MongoDB
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware

// Route to get and display audit logs
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        // Fetch audit logs from the database, populate the 'user' field with the username, sort by timestamp in descending order, and convert to plain JavaScript objects
        const logs = await AuditLog.find()
            .populate({ path: 'user', select: 'username' })
            .sort({ timestamp: -1 })
            .lean();

        console.log('Audit logs fetched:', logs); // Log the fetched audit logs for debugging purposes

        // Render the 'audit_logs' view and pass the fetched logs
        res.render('audit_logs', { logs });
    } catch (err) {
        // Log any errors that occur during the fetching of audit logs
        console.error('Error fetching audit logs:', err.message);

        // Send a 500 status code and an error message if an error occurs
        res.status(500).json({ message: 'Server Error: Unable to fetch audit logs.' });
    }
});

module.exports = router; // Export the router
