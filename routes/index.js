/**
 * @fileoverview This file defines the routes for the Budget Claims System application.
 * It includes routes for home, login, register, dashboard, help, user management, reports, logout, audit logs, and import data.
 * The routes are protected by authentication and role-checking middleware where necessary.
 * Sensitive data in request bodies is filtered out before logging.
 * 
 * @module routes/index
 */

 /**
    * Filters out sensitive fields from the request body.
    * 
    * @function filterSensitiveData
    * @param {Object} data - The data object to filter.
    * @returns {Object} The filtered data object with sensitive fields masked.
    */

 /**
    * Logs requests with user and session information.
    * 
    * @function logRequest
    * @param {Object} req - The request object.
    * @param {string} message - The log message.
    * @param {Object} [extra={}] - Additional data to log.
    */

 /**
    * Home page route.
    * Redirects to the login page.
    * 
    * @name get/
    * @function
    * @memberof module:routes/index
    * @param {Object} req - The request object.
    * @param {Object} res - The response object.
    */

 /**
    * Login page route.
    * 
    * @name get/login
    * @function
    * @memberof module:routes/index
    * @param {Object} req - The request object.
    * @param {Object} res - The response object.
    */

 /**
    * Register page route.
    * 
    * @name get/register
    * @function
    * @memberof module:routes/index
    * @param {Object} req - The request object.
    * @param {Object} res - The response object.
    */

 /**
    * Dashboard page route.
    * Only accessible to authenticated users with 'admin' or 'manager' roles.
    * 
    * @name get/dashboard
    * @function
    * @memberof module:routes/index
    * @param {Object} req - The request object.
    * @param {Object} res - The response object.
    * @throws Will throw an error if there is an issue fetching dashboard data.
    */

 /**
    * Help page route.
    * 
    * @name get/help
    * @function
    * @memberof module:routes/index
    * @param {Object} req - The request object.
    * @param {Object} res - The response object.
    */

 /**
    * User management route.
    * Only accessible to authenticated users with 'admin' role.
    * 
    * @name get/user-management
    * @function
    * @memberof module:routes/index
    * @param {Object} req - The request object.
    * @param {Object} res - The response object.
    * @throws Will throw an error if there is an issue fetching users.
    */

 /**
    * Reports page route.
    * Only accessible to authenticated users with 'admin' or 'manager' roles.
    * 
    * @name get/reports
    * @function
    * @memberof module:routes/index
    * @param {Object} req - The request object.
    * @param {Object} res - The response object.
    */

 /**
    * Logout route.
    * 
    * @name get/logout
    * @function
    * @memberof module:routes/index
    * @param {Object} req - The request object.
    * @param {Object} res - The response object.
    */

 /**
    * Audit Logs route.
    * Only accessible to authenticated users with 'admin' role.
    * 
    * @name get/audit-logs
    * @function
    * @memberof module:routes/index
    * @param {Object} req - The request object.
    * @param {Object} res - The response object.
    * @throws Will throw an error if there is an issue fetching audit logs.
    */

 /**
    * Import data page route.
    * 
    * @name get/import
    * @function
    * @memberof module:routes/index
    * @param {Object} req - The request object.
    * @param {Object} res - The response object.
    */
const express = require('express'); // Import Express to create a router
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const User = require('../models/User'); // Import the User model to interact with the users collection in MongoDB
const AuditLog = require('../models/AuditLog'); // Import the AuditLog model to interact with audit logs
const DamageType = require('../models/DamageType'); // Import the DamageType model to interact with damage types collection in MongoDB
const Location = require('../models/Location'); // Import the Location model to interact with locations collection in MongoDB
const Status = require('../models/Status'); // Import the Status model to interact with statuses collection in MongoDB
const Settings = require('../models/Settings'); // Import the Settings model to interact with settings collection in MongoDB
const { ensureAuthenticated, ensureRoles, ensureRole } = require('../middleware/auth'); // Import authentication and role-checking middleware
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
router.get('/', (req, res) => {
    logRequest(req, 'Landing page accessed');
    res.render('landing', { title: 'Welcome - Budget Claims System' });
});

// Add landing page route explicitly as well
router.get('/landing', (req, res) => {
    logRequest(req, 'Landing page accessed');
    res.render('landing', { title: 'Welcome - Budget Claims System' });
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
    logRequest(req, 'Dashboard route accessed');
    try {
        // Get all statuses first
        const statuses = await Status.find({}).lean();
        
        // Create a map of status names to their IDs
        const statusMap = new Map(
            statuses.map(s => [
                s.name.toLowerCase(), 
                { id: s._id, color: s.color, description: s.description }
            ])
        );

        // Get status IDs for counts
        const openStatus = statusMap.get('open');
        const inProgressStatus = statusMap.get('in progress');
        const closedStatus = statusMap.get('closed');

        // Get counts and recent claims in parallel
        const [
            totalClaims,
            openClaims,
            inProgressClaims,
            closedClaims,
            recentClaims
        ] = await Promise.all([
            Claim.countDocuments(),
            openStatus ? Claim.countDocuments({ status: openStatus.id }) : 0,
            inProgressStatus ? Claim.countDocuments({ status: inProgressStatus.id }) : 0,
            closedStatus ? Claim.countDocuments({ status: closedStatus.id }) : 0,
            Claim.find()
                .sort({ updatedAt: -1 })
                .limit(5)
                .populate('status')
                .select('claimNumber customerName status updatedAt createdAt')
                .lean()
                .exec()
        ]);

        // Add debug logging
        console.log('Recent Claims Debug:', {
            count: recentClaims.length,
            claims: recentClaims.map(claim => ({
                id: claim._id,
                claimNumber: claim.claimNumber,
                updatedAt: claim.updatedAt,
                status: claim.status?.name
            }))
        });

        // Transform claims with better null handling
        const transformedClaims = recentClaims.map(claim => ({
            _id: claim._id,
            claimNumber: claim.claimNumber || 'N/A',
            customerName: claim.customerName || 'No Name Provided',
            updatedAt: claim.updatedAt,
            status: {
                name: claim.status?.name || 'Pending',
                color: claim.status?.color || '#6c757d',
                description: claim.status?.description || 'Status pending',
                textColor: claim.status?.color ? getContrastColor(claim.status.color) : '#ffffff'
            }
        }));

        // Calculate average resolution time
        const closedClaimsWithResolutionTime = await Claim.find({ status: closedStatus?.id });
        let totalResolutionTime = 0;
        closedClaimsWithResolutionTime.forEach(claim => {
            const resolutionTime = (claim.updatedAt - claim.createdAt) / (1000 * 60 * 60 * 24); // Time in days
            totalResolutionTime += resolutionTime;
        });
        const avgResolutionTime = closedClaimsWithResolutionTime.length ? totalResolutionTime / closedClaimsWithResolutionTime.length : 0;

        // Prepare render data
        const renderData = {
            title: 'Dashboard - Budget Claims System',
            totalClaims,
            openClaims,
            inProgressClaims,
            closedClaims,
            avgResolutionTime,
            recentClaims: transformedClaims,
            user: req.user
        };

        logRequest(req, 'Render data prepared for dashboard', { 
            renderData: {
                ...renderData,
                recentClaimsCount: transformedClaims.length
            }
        });

        res.render('dashboard', renderData);
    } catch (err) {
        logRequest(req, 'Error fetching dashboard data', { error: err.message });
        res.status(500).render('error', {
            message: 'Error loading dashboard',
            error: process.env.NODE_ENV === 'development' ? err : {}
        });
    }
});

// Helper function to determine text color based on background
function getContrastColor(hexcolor) {
    const hex = hexcolor.replace('#', '');
    const r = parseInt(hex.substr(0,2),16);
    const g = parseInt(hex.substr(2,2),16);
    const b = parseInt(hex.substr(4,2),16);
    const yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
}

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
    req.logout((err) => {
        if (err) {
            logRequest(req, 'Error during logout', { error: err.message }); // Log error
            return res.status(500).json({ error: err.message });
        }
        res.redirect('/'); // Redirect to the home page after successful logout
    });
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

// General settings route
// Only accessible to authenticated users with 'admin' role
router.get('/general-settings', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    try {
        // Fetch all required data
        const [locations, statuses, damageTypes, settings] = await Promise.all([
            Location.find().sort('name'),
            Status.find().sort('name'),
            DamageType.find().sort('name'),
            Settings.find()
        ]);

        console.log('Fetched data for general settings:', {
            locationsCount: locations.length,
            locations: locations.map(l => l.name),
            statusesCount: statuses.length,
            damageTypesCount: damageTypes.length
        });

        // Convert settings array to object by type
        const dbSettings = settings.reduce((acc, setting) => {
            acc[setting.type] = setting;
            return acc;
        }, {});

        res.render('general_settings', {
            title: 'General Settings',
            locations,
            statuses,
            damageTypes,
            dbSettings
        });
    } catch (error) {
        console.error('Error loading general settings:', error);
        res.status(500).render('error', {
            message: 'Error loading settings page',
            error
        });
    }
});

// Add this route to handle the general settings page
router.get('/settings', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    try {
        // Fetch all locations, statuses, and damage types
        const [locations, statuses, damageTypes, dbSettings] = await Promise.all([
            Location.find().sort('name'),
            Status.find().sort('name'),
            DamageType.find().sort('name'),
            Settings.find()
        ]);

        // Convert settings array to object by type
        const settingsObj = dbSettings.reduce((acc, setting) => {
            acc[setting.type] = setting;
            return acc;
        }, {});

        // Render the template with all required data
        res.render('general_settings', {
            title: 'General Settings',
            locations: locations || [], // Provide empty array as fallback
            statuses: statuses || [],
            damageTypes: damageTypes || [],
            dbSettings: settingsObj,
            user: req.user // Pass user info if needed
        });
    } catch (error) {
        console.error('Error fetching settings data:', error);
        res.status(500).render('500', { 
            message: 'Error loading settings page',
            error: error.message
        });
    }
});

// Terms and Conditions page route
router.get('/terms', (req, res) => {
    logRequest(req, 'Terms and Conditions page accessed'); // Log route access
    res.render('terms', { title: 'Terms and Conditions - Budget Claims System' }); // Render the terms page
});

module.exports = router; // Export the router
