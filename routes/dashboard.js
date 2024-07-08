const express = require('express'); // Import Express to create a router
const router = express.Router(); // Create a new router
const Claim = require('../models/Claim'); // Import the Claim model
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware

// Route to render the dashboard
router.get('/dashboard', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        // Fetch total number of claims
        const totalClaims = await Claim.countDocuments({});
        // Fetch number of open claims
        const openClaims = await Claim.countDocuments({ status: 'Open' });
        // Fetch number of in-progress claims
        const inProgressClaims = await Claim.countDocuments({ status: 'In Progress' });
        // Fetch number of closed claims
        const closedClaims = await Claim.countDocuments({ status: 'Closed' });
        // Fetch number of claims with 'Heavy hit' damage type
        const heavyHitClaims = await Claim.countDocuments({ damageType: 'Heavy hit' });
        // Fetch number of claims with 'Light hit' damage type
        const lightHitClaims = await Claim.countDocuments({ damageType: 'Light hit' });
        // Fetch number of claims with 'Mystery' damage type
        const mysteryClaims = await Claim.countDocuments({ damageType: 'Mystery' });

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

        // Fetch the most recent 10 claim activities, sorted by the latest updated date
        const recentActivities = await Claim.find({})
            .sort({ updatedAt: -1 })
            .limit(10)
            .select('customerName mva updatedAt')
            .lean();

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
    } catch (err) {
        // Log error if fetching dashboard data fails
        console.error('Error fetching dashboard data:', err);
        // Send server error response
        res.status(500).send('Server Error');
    }
});

module.exports = router; // Export the router
