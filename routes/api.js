// Import necessary modules
const express = require('express'); // Import Express to create a router
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const Customer = require('../models/Customer'); // Import the Customer model to interact with the customers collection in MongoDB
const { ensureAuthenticated, ensureRole } = require('../middleware/auth'); // Import authentication and role-checking middleware

const router = express.Router(); // Create a new router

// API route to get all claims
router.get('/claims', ensureAuthenticated, (req, res) => {
    // Fetch all claims from the database
    Claim.find()
        .then(claims => res.json(claims)) // Respond with all claims
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// API route to get a specific claim by ID
router.get('/claims/:id', ensureAuthenticated, (req, res) => {
    // Fetch a claim by its ID from the database
    Claim.findById(req.params.id)
        .then(claim => {
            if (!claim) {
                return res.status(404).json({ msg: 'Claim not found' }); // Handle case where claim is not found
            }
            res.json(claim); // Respond with the claim
        })
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// API route to add a new claim
router.post('/claims', ensureAuthenticated, (req, res) => {
    const { mva, customerName, description, status } = req.body; // Extract claim details from the request body

    // Create a new claim object
    const newClaim = new Claim({
        mva,
        customerName,
        description,
        status,
        files: [] // No files uploaded via API
    });

    // Save the claim to the database
    newClaim.save()
        .then(claim => res.json(claim)) // Respond with the saved claim
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// API route to update a claim by ID
router.put('/claims/:id', ensureAuthenticated, (req, res) => {
    // Update the claim in the database
    Claim.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .then(claim => {
            if (!claim) {
                return res.status(404).json({ msg: 'Claim not found' }); // Handle case where claim is not found
            }
            res.json(claim); // Respond with the updated claim
        })
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// API route to delete a claim by ID
router.delete('/claims/:id', ensureAuthenticated, ensureRole('admin'), (req, res) => {
    // Delete the claim from the database
    Claim.findByIdAndDelete(req.params.id)
        .then(claim => {
            if (!claim) {
                return res.status(404).json({ msg: 'Claim not found' }); // Handle case where claim is not found
            }
            res.json({ msg: 'Claim deleted' }); // Respond with deletion confirmation
        })
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// API route to get all customers
router.get('/customers', ensureAuthenticated, (req, res) => {
    // Fetch all customers from the database
    Customer.find()
        .then(customers => res.json(customers)) // Respond with all customers
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// API route to get a specific customer by ID
router.get('/customers/:id', ensureAuthenticated, (req, res) => {
    // Fetch a customer by its ID from the database
    Customer.findById(req.params.id)
        .then(customer => {
            if (!customer) {
                return res.status(404).json({ msg: 'Customer not found' }); // Handle case where customer is not found
            }
            res.json(customer); // Respond with the customer
        })
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// API route to add a new customer
router.post('/customers', ensureAuthenticated, ensureRole('admin'), (req, res) => {
    const { name, email, password } = req.body; // Extract customer details from the request body

    // Create a new customer object
    const newCustomer = new Customer({
        name,
        email,
        password // Password should be hashed before saving in a real-world application
    });

    // Save the customer to the database
    newCustomer.save()
        .then(customer => res.json(customer)) // Respond with the saved customer
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// API route to update a customer by ID
router.put('/customers/:id', ensureAuthenticated, ensureRole('admin'), (req, res) => {
    // Update the customer in the database
    Customer.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .then(customer => {
            if (!customer) {
                return res.status(404).json({ msg: 'Customer not found' }); // Handle case where customer is not found
            }
            res.json(customer); // Respond with the updated customer
        })
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// API route to delete a customer by ID
router.delete('/customers/:id', ensureAuthenticated, ensureRole('admin'), (req, res) => {
    // Delete the customer from the database
    Customer.findByIdAndDelete(req.params.id)
        .then(customer => {
            if (!customer) {
                return res.status(404).json({ msg: 'Customer not found' }); // Handle case where customer is not found
            }
            res.json({ msg: 'Customer deleted' }); // Respond with deletion confirmation
        })
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

module.exports = router; // Export the router
