/**
 * @fileoverview This file defines the routes for the dashboard in the Budget Claims System.
 * It includes middleware for authentication and role-checking, and logs requests using Pino logger.
 * The dashboard route fetches various statistics about claims and renders the dashboard view.
 */

 /**
 * Filters out sensitive fields from the request body.
 * 
 * @param {Object} data - The data object to filter.
 * @returns {Object} The filtered data with sensitive fields masked.
 */
 
 /**
 * Logs requests with user and session info.
 * 
 * @param {Object} req - The request object.
 * @param {string} message - The log message.
 * @param {Object} [extra={}] - Additional data to log.
 */

 /**
 * Route to render the dashboard.
 * 
 * @name GET/dashboard
 * @function
 * @memberof module:routes/dashboard
 * @inner
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @throws Will throw an error if fetching dashboard data fails.
 */
const express = require('express'); // Import Express to create a router
const router = express.Router(); // Create a new router
const Claim = require('../models/Claim'); // Import the Claim model
const Status = require('../models/Status'); // Make sure Status is imported
const { ensureAuthenticated } = require('../middleware/auth'); // Import authentication and role-checking middleware
const pinoLogger = require('../logger'); // Import Pino logger

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

// Route to render the dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        // Get all statuses first
        const statuses = await Status.find({}).lean();
        
        // Create a map of status names to their IDs and colors
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
                .lean()
                .exec()
        ]);

        // Transform claims with better null handling
        const transformedClaims = recentClaims.map(claim => ({
            _id: claim._id,
            claimNumber: claim.claimNumber || 'N/A',
            customerName: claim.customerName || 'No Name Provided',
            updatedAt: claim.updatedAt,
            status: {
                name: claim.status?.name || 'Pending',
                color: claim.status?.color || '#6c757d', // Default gray color
                description: claim.status?.description || 'Status pending',
                textColor: claim.status?.color ? getContrastColor(claim.status.color) : '#ffffff'
            }
        }));

        // Add debug logging to help troubleshoot
        pinoLogger.debug({
            message: 'Dashboard recent claims',
            recentClaimsCount: recentClaims.length,
            transformedClaimsCount: transformedClaims.length,
            sampleClaim: transformedClaims[0]
        });

        res.render('dashboard', {
            title: 'Dashboard',
            totalClaims,
            openClaims,
            inProgressClaims,
            closedClaims,
            recentClaims: transformedClaims,
            user: req.user
        });

    } catch (error) {
        pinoLogger.error({
            message: 'Dashboard error',
            error: error.message,
            stack: error.stack
        });
        res.status(500).render('error', { 
            message: 'Error loading dashboard',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Helper function to determine text color based on background
function getContrastColor(hexcolor) {
    // Remove the # if present
    const hex = hexcolor.replace('#', '');
    const r = parseInt(hex.substr(0,2),16);
    const g = parseInt(hex.substr(2,2),16);
    const b = parseInt(hex.substr(4,2),16);
    const yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
}

// Helper function to lighten a color
function lightenColor(color, percent) {
    const num = parseInt(color.replace('#',''),16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    B = (num >> 8 & 0x00FF) + amt,
    G = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
}

module.exports = router; // Export the router
