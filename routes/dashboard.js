const express = require('express');
const router = express.Router();
const Claim = require('../models/Claim');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');

router.get('/dashboard', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        const totalClaims = await Claim.countDocuments({});
        const openClaims = await Claim.countDocuments({ status: 'Open' });
        const inProgressClaims = await Claim.countDocuments({ status: 'In Progress' });
        const closedClaims = await Claim.countDocuments({ status: 'Closed' });
        const heavyHitClaims = await Claim.countDocuments({ damageType: 'Heavy hit' });
        const lightHitClaims = await Claim.countDocuments({ damageType: 'Light hit' });
        const mysteryClaims = await Claim.countDocuments({ damageType: 'Mystery' });

        const avgResolutionTime = await Claim.aggregate([
            { $match: { status: 'Closed' } },
            {
                $group: {
                    _id: null,
                    avgResolutionTime: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } }
                }
            }
        ]);

        const recentActivities = await Claim.find({})
            .sort({ updatedAt: -1 })
            .limit(10)
            .select('customerName mva updatedAt')
            .lean();

        const recentActivityMessages = recentActivities.map(activity => 
            `Claim ${activity.mva} for ${activity.customerName} was updated on ${new Date(activity.updatedAt).toLocaleDateString()}`
        );

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
        console.error('Error fetching dashboard data:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
