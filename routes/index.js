const express = require('express'); // Import Express to create a router
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const User = require('../models/User'); // Import the User model to interact with the users collection in MongoDB
const AuditLog = require('../models/AuditLog'); // Import the AuditLog model to interact with audit logs
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware
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

// Home page route
// Redirects to the login page
router.get('/', (req, res) => {
    logRequest(req, 'Home route accessed, redirecting to login');
    res.redirect('/login'); // Redirect to the login page
});

// Login page route
router.get('/login', (req, res) => {
    logRequest(req, 'Login route accessed'); // Log route access
    res.render('login', { title: 'Login' }); // Render the login page with the title 'Login'
});

// Register page route
router.get('/register', (req, res) => {
    logRequest(req, 'Register route accessed'); // Log route access
    res.render('register', { title: 'Register' }); // Render the register page with the title 'Register'
});

// Dashboard page route
// Only accessible to authenticated users with 'admin' or 'manager' roles
router.get('/dashboard', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    logRequest(req, 'Dashboard route accessed'); // Log route access
    try {
        // Fetch total number of claims
        const totalClaims = await Claim.countDocuments();
        logRequest(req, 'Total Claims fetched', { totalClaims }); // Log total claims

        // Fetch number of claims by status
        const openClaims = await Claim.countDocuments({ status: 'Open' });
        logRequest(req, 'Open Claims fetched', { openClaims }); // Log open claims

        const inProgressClaims = await Claim.countDocuments({ status: 'In Progress' });
        logRequest(req, 'In Progress Claims fetched', { inProgressClaims }); // Log in progress claims

        const closedClaims = await Claim.countDocuments({ status: 'Closed' });
        logRequest(req, 'Closed Claims fetched', { closedClaims }); // Log closed claims

        // Calculate average resolution time
        const closedClaimsWithResolutionTime = await Claim.find({ status: 'Closed' });
        let totalResolutionTime = 0;
        closedClaimsWithResolutionTime.forEach(claim => {
            const resolutionTime = (claim.updatedAt - claim.createdAt) / (1000 * 60 * 60 * 24); // Time in days
            totalResolutionTime += resolutionTime;
        });
        const avgResolutionTime = closedClaimsWithResolutionTime.length ? totalResolutionTime / closedClaimsWithResolutionTime.length : 0;
        logRequest(req, 'Average Resolution Time calculated', { avgResolutionTime }); // Log average resolution time

        // Render the dashboard view with the analytics data
        const renderData = {
            title: 'Dashboard - Budget Claims System',
            totalClaims,
            openClaims,
            inProgressClaims,
            closedClaims,
            avgResolutionTime
        };
        logRequest(req, 'Render data prepared for dashboard', { renderData }); // Log render data

        res.render('dashboard', renderData); // Render the dashboard page with analytics data
    } catch (err) {
        logRequest(req, 'Error fetching dashboard data', { error: err.message }); // Log error
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// Help page route
router.get('/help', (req, res) => {
    logRequest(req, 'Help route accessed'); // Log route access
    res.render('help', { title: 'Help' }); // Render the help page with the title 'Help'
});

// User management route
// Only accessible to authenticated users with 'admin' role
router.get('/user-management', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    logRequest(req, 'User Management route accessed'); // Log route access
    try {
        const users = await User.find(); // Fetch all users from the database
        logRequest(req, 'Users fetched', { users }); // Log fetched users
        res.render('user_management', { title: 'User Management', users }); // Render the user management page with fetched users
    } catch (err) {
        logRequest(req, 'Error fetching users', { error: err.message }); // Log error
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// Reports page route
// Only accessible to authenticated users with 'admin' or 'manager' roles
router.get('/reports', ensureAuthenticated, ensureRoles(['admin', 'manager']), (req, res) => {
    logRequest(req, 'Reports route accessed'); // Log route access
    res.render('reports', { title: 'Reports' }); // Render the reports page with the title 'Reports'
});

// Logout route
router.get('/logout', (req, res) => {
    logRequest(req, 'Logout route accessed'); // Log route access
    req.logout(); // Logout the user
    res.redirect('/'); // Redirect to the home page
});

// Audit Logs Route
// Only accessible to authenticated users with 'admin' role
router.get('/audit-logs', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    logRequest(req, 'Audit Logs route accessed'); // Log route access
    try {
        const auditLogs = await AuditLog.find().populate('user', 'name email').sort({ timestamp: -1 }).exec(); // Fetch all audit logs, populate user details, and sort by timestamp
        logRequest(req, 'Audit logs fetched', { auditLogs }); // Log fetched audit logs
        res.render('audit_logs', { title: 'Audit Logs', auditLogs }); // Render the audit logs page with fetched audit logs
    } catch (err) {
        logRequest(req, 'Error fetching audit logs', { error: err.message }); // Log error
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// Import data page route
router.get('/import', (req, res) => {
    logRequest(req, 'Import data route accessed'); // Log route access
    res.render('import', { title: 'Import Data - Budget Claims System' }); // Render the import data page with the title 'Import Data - Budget Claims System'
});

module.exports = router; // Export the router
