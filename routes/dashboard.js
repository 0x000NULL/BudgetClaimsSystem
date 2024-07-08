const express = require('express'); // Import Express to create a router
const router = express.Router(); // Create a new router
const Claim = require('../models/Claim'); // Import the Claim model
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware
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
router.get('/dashboard', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    logRequest(req, 'Accessing dashboard');
    try {
        // Fetch total number of claims
        const totalClaims = await Claim.countDocuments({});
        logRequest(req, 'Total claims fetched', { totalClaims });

        // Fetch number of open claims
        const openClaims = await Claim.countDocuments({ status: 'Open' });
        logRequest(req, 'Open claims fetched', { openClaims });

        // Fetch number of in-progress claims
        const inProgressClaims = await Claim.countDocuments({ status: 'In Progress' });
        logRequest(req, 'In-progress claims fetched', { inProgressClaims });

        // Fetch number of closed claims
        const closedClaims = await Claim.countDocuments({ status: 'Closed' });
        logRequest(req, 'Closed claims fetched', { closedClaims });

        // Fetch number of claims with 'Heavy hit' damage type
        const heavyHitClaims = await Claim.countDocuments({ damageType: 'Heavy hit' });
        logRequest(req, 'Heavy hit claims fetched', { heavyHitClaims });

        // Fetch number of claims with 'Light hit' damage type
        const lightHitClaims = await Claim.countDocuments({ damageType: 'Light hit' });
        logRequest(req, 'Light hit claims fetched', { lightHitClaims });

        // Fetch number of claims with 'Mystery' damage type
        const mysteryClaims = await Claim.countDocuments({ damageType: 'Mystery' });
        logRequest(req, 'Mystery claims fetched', { mysteryClaims });

        // Calculate average resolution time for closed claims
        const avgResolutionTime = await Claim.aggregate([
            { $match: { status: 'Closed' } },
            {
                $group: {
                    _id: null,
                    avgResolutionTime: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } }
                }
            }
        ]);
        logRequest(req, 'Average resolution time calculated', { avgResolutionTime });

        // Fetch the most recent 10 claim activities, sorted by the latest updated date
        const recentActivities = await Claim.find({})
            .sort({ updatedAt: -1 })
            .limit(10)
            .select('customerName mva updatedAt')
            .lean();
        logRequest(req, 'Recent activities fetched', { recentActivities });

        // Map the recent activities to a human-readable message
        const recentActivityMessages = recentActivities.map(activity =>
            `Claim ${activity.mva} for ${activity.customerName} was updated on ${new Date(activity.updatedAt).toLocaleDateString()}`
        );

        // Render the dashboard view with the collected data
        res.render('dashboard', {
            title: 'Dashboard - Budget Claims System',
            totalClaims,
            openClaims,
            inProgressClaims,
            closedClaims,
            heavyHitClaims,
            lightHitClaims,
            mysteryClaims,
            avgResolutionTime: avgResolutionTime[0] ? (avgResolutionTime[0].avgResolutionTime / (1000 * 60 * 60 * 24)).toFixed(2) : 'N/A', // Convert ms to days
            recentActivities: recentActivityMessages
        });
        logRequest(req, 'Dashboard rendered successfully');
    } catch (err) {
        // Log error if fetching dashboard data fails
        logRequest(req, 'Error fetching dashboard data', { error: err });
        // Send server error response
        res.status(500).send('Server Error');
    }
});

module.exports = router; // Export the router
