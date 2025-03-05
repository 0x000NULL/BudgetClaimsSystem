/**
 * @fileoverview This file defines the routes for the dashboard in the Budget Claims System.
 * It includes middleware for authentication and role-checking, and logs requests using Pino logger.
 * The dashboard route fetches various statistics about claims and renders the dashboard view.
 * @module routes/dashboard
 */

const express = require('express');
const router = express.Router();
const Claim = require('../models/Claim');
const Status = require('../models/Status');
const { ensureAuthenticated } = require('../middleware/auth');
const pinoLogger = require('../logger');

// Define sensitive fields that should not be logged
const sensitiveFields = ['password', 'token', 'ssn', 'creditcard', 'creditCard', 'securityanswer', 'securityAnswer'];

/**
 * Filters out sensitive fields from the request body.
 * 
 * @param {Object} data - The data object to filter.
 * @returns {Object} The filtered data with sensitive fields masked.
 */
const filterSensitiveData = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    return Object.keys(data).reduce((filteredData, key) => {
        if (sensitiveFields.includes(key.toLowerCase())) {
            // Preserve null and undefined values
            filteredData[key] = data[key] === null || data[key] === undefined ? data[key] : '***REDACTED***';
        } else if (typeof data[key] === 'object' && data[key] !== null) {
            // Recursively filter nested objects with null check
            filteredData[key] = filterSensitiveData(data[key]);
        } else {
            filteredData[key] = data[key];
        }
        return filteredData;
    }, {});
};

/**
 * Logs requests with user and session info.
 * 
 * @param {Object} req - The request object.
 * @param {string} message - The log message.
 * @param {Object} [extra={}] - Additional data to log.
 */
const logRequest = (req, message, extra = {}) => {
    // Destructure with default empty object to prevent errors if body is undefined
    const { method, originalUrl, headers, body = {} } = req;
    const filteredBody = filterSensitiveData(body);

    pinoLogger.info({
        message,
        user: req.user ? req.user.email : 'Unauthenticated',
        ip: req.ip,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString(),
        method,
        url: originalUrl,
        requestBody: filteredBody,
        headers,
        ...extra // Include any extra logging data passed in
    });
};

// Special middleware for testing - must be defined before routes
if (process.env.NODE_ENV === 'test') {
    router.use((req, res, next) => {
        const originalRender = res.render;
        res.render = function(view, locals) {
            res.status(200).json({ view, locals });
        };
        next();
    });
}

/**
 * Route to render the dashboard.
 * Displays claim statistics and recent claims.
 * 
 * @name GET/dashboard
 * @function
 * @memberof module:routes/dashboard
 * @inner
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @throws Will throw an error if fetching dashboard data fails.
 */
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        // Log the dashboard request
        logRequest(req, 'Dashboard accessed');
        
        // Get all statuses first
        const statuses = await Status.find({}).lean().exec();
        
        if (!statuses || !Array.isArray(statuses) || statuses.length === 0) {
            throw new Error('Failed to retrieve statuses');
        }
        
        // Create a map of status names to their IDs and colors
        const statusMap = new Map(
            statuses.map(s => [
                s.name.toLowerCase(), 
                { id: s._id, color: s.color || '#6c757d', description: s.description || '' }
            ])
        );

        // Get status IDs for counts with safer access
        const openStatus = statusMap.get('open') || { id: null, color: '#6c757d' };
        const inProgressStatus = statusMap.get('in progress') || { id: null, color: '#6c757d' };
        const closedStatus = statusMap.get('closed') || { id: null, color: '#6c757d' };

        // Get counts and recent claims in parallel
        const [
            totalClaims,
            openClaims,
            inProgressClaims,
            closedClaims,
            recentClaims
        ] = await Promise.all([
            Claim.countDocuments(),
            openStatus.id ? Claim.countDocuments({ status: openStatus.id }) : 0,
            inProgressStatus.id ? Claim.countDocuments({ status: inProgressStatus.id }) : 0,
            closedStatus.id ? Claim.countDocuments({ status: closedStatus.id }) : 0,
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
            sampleClaim: transformedClaims.length > 0 ? transformedClaims[0] : null
        });

        // Calculate percentages for status distribution
        const totalProcessed = openClaims + inProgressClaims + closedClaims;
        const openPercentage = totalProcessed ? Math.round((openClaims / totalProcessed) * 100) : 0;
        const inProgressPercentage = totalProcessed ? Math.round((inProgressClaims / totalProcessed) * 100) : 0;
        const closedPercentage = totalProcessed ? Math.round((closedClaims / totalProcessed) * 100) : 0;

        const dashboardData = {
            title: 'Dashboard',
            totalClaims,
            openClaims,
            inProgressClaims,
            closedClaims,
            openPercentage,
            inProgressPercentage,
            closedPercentage,
            recentClaims: transformedClaims,
            user: req.user,
            statusColors: {
                open: openStatus.color,
                inProgress: inProgressStatus.color,
                closed: closedStatus.color
            }
        };

        res.render('dashboard', dashboardData);

    } catch (error) {
        pinoLogger.error({
            message: 'Dashboard error',
            error: error.message,
            stack: error.stack
        });
        
        const errorData = { 
            title: 'Error',
            message: 'Error loading dashboard',
            error: process.env.NODE_ENV === 'development' ? error : {}
        };
        
        if (process.env.NODE_ENV === 'test') {
            res.status(500).json({ view: 'error', locals: errorData });
        } else {
            res.status(500).render('error', errorData);
        }
    }
});

/**
 * Determines appropriate text color (black or white) based on background color.
 * Uses the YIQ formula to calculate perceived brightness.
 *
 * @param {string} hexcolor - The hex color code (with or without #).
 * @returns {string} - Returns '#000000' for dark text or '#ffffff' for light text.
 */
function getContrastColor(hexcolor) {
    if (!hexcolor || typeof hexcolor !== 'string') {
        return '#ffffff'; // Default to white text if invalid input
    }
    
    // Remove the # if present
    const hex = hexcolor.replace('#', '');
    
    // Check if we have a valid hex color
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
        return '#ffffff'; // Default to white text if invalid hex
    }
    
    const r = parseInt(hex.substr(0,2),16);
    const g = parseInt(hex.substr(2,2),16);
    const b = parseInt(hex.substr(4,2),16);
    const yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
}

/**
 * Lightens a color by the specified percentage.
 *
 * @param {string} color - The hex color code (with #).
 * @param {number} percent - The percentage to lighten by (0-100).
 * @returns {string} - Returns the lightened hex color.
 */
function lightenColor(color, percent) {
    // Handle invalid inputs
    if (!color || typeof color !== 'string') {
        return '#ffffff'; // Return white if null, undefined, or not a string
    }
    
    // For invalid hex colors that still start with #, return the original
    if (color.startsWith('#') && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        pinoLogger.warn({
            message: 'Invalid hex color format',
            color
        });
        return color; // Return original invalid color that starts with #
    }
    
    if (!color.startsWith('#')) {
        return '#ffffff'; // For other invalid formats, return white
    }
    
    try {
        const num = parseInt(color.replace('#',''),16),
        amt = Math.round(2.55 * percent),
        R = Math.min(255, Math.max(0, (num >> 16) + amt)),
        B = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt)),
        G = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        
        return '#' + (0x1000000 + (R*0x10000) + (B*0x100) + G).toString(16).slice(1);
    } catch (error) {
        pinoLogger.warn({
            message: 'Error lightening color',
            color,
            percent,
            error: error.message
        });
        return color; // Return original color if calculation fails
    }
}

// Export the router
module.exports = router;

// Export utility functions for testing
if (process.env.NODE_ENV === 'test') {
    module.exports.filterSensitiveData = filterSensitiveData;
    module.exports.logRequest = logRequest;
    module.exports.getContrastColor = getContrastColor;
    module.exports.lightenColor = lightenColor;
}
