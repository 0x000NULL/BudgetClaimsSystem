const express = require('express'); // Import Express to create a router
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const path = require('path'); // Import Path to handle file and directory paths
const { ensureAuthenticated, ensureRoles, ensureRole } = require('../middleware/auth'); // Import authentication and role-checking middleware
const logActivity = require('../middleware/activityLogger'); // Import activity logging middleware
const {
    notifyNewClaim,
    notifyClaimStatusUpdate
} = require('../notifications/notify'); // Import notification functions

const router = express.Router(); // Create a new router

// Route to get all claims or filter claims based on query parameters, accessible by admin, manager, and employee
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), logActivity('Viewed claims list'), (req, res) => {
    const { mva, customerName, status, startDate, endDate } = req.query; // Extract query parameters

    // Build a filter object based on provided query parameters
    let filter = {};
    if (mva) filter.mva = mva;
    if (customerName) filter.customerName = new RegExp(customerName, 'i'); // Case-insensitive search
    if (status) filter.status = status;
    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate); // Filter by start date
        if (endDate) filter.date.$lte = new Date(endDate); // Filter by end date
    }

    // Find claims based on the filter object
    Claim.find(filter)
        .then(claims => res.json(claims)) // Respond with filtered claims
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// Route to add a new claim, accessible by admin and manager
router.post('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Added new claim'), (req, res) => {
    const { mva, customerName, description, status } = req.body; // Extract claim details from the request body

    // Initialize an array to hold uploaded file names
    let filesArray = [];

    // Check if files were uploaded
    if (req.files) {
        const files = req.files.files;
        if (!Array.isArray(files)) filesArray.push(files); // Ensure files is always an array
        else filesArray = files;

        // Save each file to the uploads directory
        filesArray.forEach(file => {
            const filePath = path.join(__dirname, '../uploads', file.name);
            file.mv(filePath, err => {
                if (err) {
                    return res.status(500).json({ error: err.message }); // Handle file upload error
                }
            });
        });
    }

    // Create a new claim object
    const newClaim = new Claim({
        mva,
        customerName,
        description,
        status,
        files: filesArray.map(file => file.name) // Store file names in the claim
    });

    // Save the claim to the database
    newClaim.save()
        .then(claim => {
            res.json(claim); // Respond with the saved claim
            notifyNewClaim(req.user.email, claim); // Send notification about the new claim
        })
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// Route to get a specific claim by ID, accessible by admin, manager, and employee
router.get('/:id', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), logActivity('Viewed claim details'), (req, res) => {
    Claim.findById(req.params.id)
        .then(claim => res.json(claim)) // Respond with the claim
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// Route to update a claim by ID, accessible by admin and manager
router.put('/:id', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Updated claim'), (req, res) => {
    Claim.findById(req.params.id)
        .then(claim => {
            // Save the current version of the claim before updating
            claim.versions.push({
                description: claim.description,
                status: claim.status,
                files: claim.files,
                updatedAt: claim.updatedAt
            });

            // Update the claim with new data
            claim.description = req.body.description || claim.description;
            claim.status = req.body.status || claim.status;
            claim.files = req.body.files || claim.files;

            // Save the updated claim to the database
            claim.save()
                .then(updatedClaim => {
                    res.json(updatedClaim); // Respond with the updated claim
                    notifyClaimStatusUpdate(req.user.email, updatedClaim); // Send notification about the claim status update
                })
                .catch(err => res.status(500).json({ error: err.message })); // Handle errors
        })
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// Route to delete a claim by ID, accessible only by admin
router.delete('/:id', ensureAuthenticated, ensureRole('admin'), logActivity('Deleted claim'), (req, res) => {
    Claim.findByIdAndDelete(req.params.id)
        .then(() => res.json({ msg: 'Claim deleted' })) // Respond with deletion confirmation
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

module.exports = router;