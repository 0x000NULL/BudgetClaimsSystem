const express = require('express'); // Import Express to create a router
const bcrypt = require('bcryptjs'); // Import Bcrypt for hashing passwords
const passport = require('passport'); // Import Passport for authentication
const jwt = require('jsonwebtoken'); // Import JWT for token generation
const Customer = require('../models/Customer'); // Import the Customer model
const Claim = require('../models/Claim'); // Import the Claim model
const { ensureAuthenticated } = require('../middleware/auth'); // Import authentication middleware
const router = express.Router(); // Create a new router

// Route for customer registration
router.post('/register', (req, res) => {
    const { name, email, password } = req.body; // Extract registration details from the request body
    let errors = [];

    // Check required fields
    if (!name || !email || !password) {
        errors.push({ msg: 'Please enter all fields' });
    }

    // Handle errors if any
    if (errors.length > 0) {
        res.status(400).json({ errors });
    } else {
        // Check if customer with the email already exists
        Customer.findOne({ email }).then(customer => {
            if (customer) {
                res.status(400).json({ msg: 'Email already exists' });
            } else {
                // Create a new customer
                const newCustomer = new Customer({ name, email, password });

                // Hash password before saving
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newCustomer.password, salt, (err, hash) => {
                        if (err) throw err;
                        newCustomer.password = hash;
                        newCustomer.save()
                            .then(customer => res.json({ msg: 'Customer registered' }))
                            .catch(err => console.log(err));
                    });
                });
            }
        });
    }
});

// Route for customer login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, customer, info) => {
        if (err) throw err;
        if (!customer) res.status(400).json({ msg: 'No customer exists' });
        else {
            req.logIn(customer, err => {
                if (err) throw err;
                const token = jwt.sign({ id: customer._id }, 'your_jwt_secret', { expiresIn: '1h' });
                res.json({ token });
            });
        }
    })(req, res, next);
});

// Route for submitting a new claim
router.post('/claims', ensureAuthenticated, (req, res) => {
    const { mva, description } = req.body; // Extract claim details from the request body
    const customerId = req.user._id; // Get the authenticated customer's ID

    // Create a new claim object
    const newClaim = new Claim({
        mva,
        customerName: req.user.name,
        description,
        status: 'Open',
        files: [] // No files uploaded via customer portal
    });

    // Save the claim to the database
    newClaim.save()
        .then(claim => {
            // Update the customer's claims
            Customer.findByIdAndUpdate(customerId, { $push: { claims: claim._id } })
                .then(() => res.json(claim))
                .catch(err => res.status(500).json({ error: err.message }));
        })
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// Route for viewing customer's claims
router.get('/claims', ensureAuthenticated, (req, res) => {
    Claim.find({ customerName: req.user.name })
        .then(claims => res.json(claims))
        .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;
