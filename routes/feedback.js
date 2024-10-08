/**
 * @file /home/stripcheese/Desktop/BudgetClaimsSystem/routes/feedback.js
 * @description This file defines the routes for handling feedback in the Budget Claims System.
 * It includes middleware for authentication and role-based access control, as well as logging functionality.
 */

 /**
 * Filters out sensitive fields from the provided data object.
 * 
 * @function filterSensitiveData
 * @param {Object} data - The data object to be filtered.
 * @returns {Object} The filtered data object with sensitive fields redacted.
 */

 /**
 * Logs the details of an incoming request, including user and session information.
 * 
 * @function logRequest
 * @param {Object} req - The Express request object.
 * @param {string} message - The log message.
 * @param {Object} [extra={}] - Additional information to log.
 */

 /**
 * Route to view feedback, accessible only by users with 'admin' or 'manager' roles.
 * 
 * @name GET /
 * @function
 * @memberof module:routes/feedback
 * @inner
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @returns {void}
 */
const express = require('express'); // Import Express to create a router
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import middleware to ensure authentication and role-based access
const pinoLogger = require('../logger'); // Import Pino logger

const router = express.Router(); // Create a new router

// Define sensitive fields that should not be logged
const sensitiveFields = ['password', 'token', 'ssn'];

// Function to filter out sensitive fields from the request body
const filterSensitiveData = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }
    
    return Object.keys(data).reduce((filteredData, key) => {
        if (sensitiveFields.includes(key)) {
            filteredData[key] = '***REDACTED***'; // Mask the sensitive field
        } else if (typeof data[key] === 'object') {
            filteredData[key] = filterSensitiveData(data[key]); // Recursively filter nested objects
        } else {
            filteredData[key] = data[key];
        }
        return filteredData;
    }, {});
};

// Helper function to log requests with user and session info
const logRequest = (req, message, extra = {}) => {
    const { method, originalUrl, headers, body } = req;
    const filteredBody = filterSensitiveData(body); // Filter sensitive data from the request body

    pinoLogger.info({
        message, // Log message
        user: req.user ? req.user.email : 'Unauthenticated', // Log user
        ip: req.ip, // Log IP address
        sessionId: req.sessionID, // Log session ID
        timestamp: new Date().toISOString(), // Add a timestamp
        method, // Log HTTP method
        url: originalUrl, // Log originating URL
        requestBody: filteredBody, // Log the filtered request body
        headers // Log request headers
    });
};

// Route to view feedback, accessible only by admin and manager
router.get(
    '/',
    ensureAuthenticated, // Ensure the user is authenticated
    ensureRoles(['admin', 'manager']), // Ensure the user has 'admin' or 'manager' role
    (req, res) => {
        logRequest(req, 'Feedback view accessed');
        // Render the feedback view with a title
        res.render('feedback', { title: 'Feedback' });
    }
);

module.exports = router; // Export the router
