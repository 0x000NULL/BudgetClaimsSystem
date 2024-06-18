const express = require('express'); // Import Express to create a router
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware
const router = express.Router(); // Create a new router

// Route to get dashboard analytics, accessible by admin and manager
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        // Get total number of claims
        const totalClaims = await Claim.countDocuments();

        // Get number of claims by status
        const openClaims = await Claim.countDocuments({ status: 'Open' });
        const inProgressClaims = await Claim.countDocuments({ status: 'In Progress' });
        const closedClaims = await Claim.countDocuments({ status: 'Closed' });

        // Calculate average resolution time
        const closedClaimsWithResolutionTime = await Claim.find({ status: 'Closed' });
        let totalResolutionTime = 0;
        closedClaimsWithResolutionTime.forEach(claim => {
            const resolutionTime = (claim.updatedAt - claim.createdAt) / (1000 * 60 * 60 * 24); // Time in days
            totalResolutionTime += resolutionTime;
        });
        const avgResolutionTime = closedClaimsWithResolutionTime.length ? totalResolutionTime / closedClaimsWithResolutionTime.length : 0;

        // Respond with the analytics data
        res.json({
            totalClaims,
            openClaims,
            inProgressClaims,
            closedClaims,
            avgResolutionTime
        });
    } catch (err) {
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

module.exports = router; // Export the router
