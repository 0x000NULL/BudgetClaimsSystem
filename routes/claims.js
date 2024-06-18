const express = require('express');
const Claim = require('../models/Claim');
const path = require('path');
const { ensureAuthenticated, ensureRoles, ensureRole } = require('../middleware/auth');
const router = express.Router();

// Route to get all claims, accessible by admin, manager, and employee
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), (req, res) => {
    Claim.find()
        .then(claims => res.json(claims)) // Respond with all claims
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// Route to add a new claim, accessible by admin and manager
router.post('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), (req, res) => {
    const { mva, customerName, description, status } = req.body;

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
        .then(claim => res.json(claim)) // Respond with the saved claim
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// Route to get a specific claim by ID, accessible by admin, manager, and employee
router.get('/:id', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), (req, res) => {
    Claim.findById(req.params.id)
        .then(claim => res.json(claim)) // Respond with the claim
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// Route to update a claim by ID, accessible by admin and manager
router.put('/:id', ensureAuthenticated, ensureRoles(['admin', 'manager']), (req, res) => {
    Claim.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .then(claim => res.json(claim)) // Respond with the updated claim
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// Route to delete a claim by ID, accessible only by admin
router.delete('/:id', ensureAuthenticated, ensureRole('admin'), (req, res) => {
    Claim.findByIdAndDelete(req.params.id)
        .then(() => res.json({ msg: 'Claim deleted' })) // Respond with deletion confirmation
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

module.exports = router;
