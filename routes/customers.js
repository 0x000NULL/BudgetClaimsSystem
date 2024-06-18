const express = require('express'); // Import Express to create a router
const bcrypt = require('bcryptjs'); // Import Bcrypt for hashing passwords
const passport = require('passport'); // Import Passport for authentication
const jwt = require('jsonwebtoken'); // Import JWT for token generation
const Customer = require('../models/Customer'); // Import the Customer model
const Claim = require('../models/Claim'); // Import the Claim model
const { ensureAuthenticated } = require('../middleware/auth'); // Import authentication middleware
const speakeasy = require('speakeasy'); // Import Speakeasy for 2FA
const qrcode = require('qrcode'); // Import QRCode for generating QR codes
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
                if (customer.twoFactorEnabled) {
                    res.json({ twoFactorRequired: true }); // Indicate that 2FA is required
                } else {
                    const token = jwt.sign({ id: customer._id }, 'your_jwt_secret', { expiresIn: '1h' });
                    res.json({ token });
                }
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

// Route to view settings page
router.get('/settings', ensureAuthenticated, (req, res) => {
    res.render('customer/settings', { user: req.user, qrCodeUrl: null });
});

// Route to reset password
router.post('/settings/reset-password', ensureAuthenticated, (req, res) => {
    const { currentPassword, newPassword } = req.body; // Extract current and new passwords from the request body

    Customer.findById(req.user._id).then(customer => {
        // Check if current password matches
        bcrypt.compare(currentPassword, customer.password, (err, isMatch) => {
            if (err) throw err;
            if (!isMatch) {
                res.status(400).json({ msg: 'Current password is incorrect' });
            } else {
                // Hash new password before saving
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newPassword, salt, (err, hash) => {
                        if (err) throw err;
                        customer.password = hash;
                        customer.save()
                            .then(() => res.json({ msg: 'Password reset successful' }))
                            .catch(err => res.status(500).json({ error: err.message }));
                    });
                });
            }
        });
    });
});

// Route to setup 2FA
router.post('/settings/setup-2fa', ensureAuthenticated, (req, res) => {
    const secret = speakeasy.generateSecret({ length: 20 }); // Generate a secret key

    // Save the secret key to the customer's account
    Customer.findByIdAndUpdate(req.user._id, { twoFactorSecret: secret.base32 }, { new: true })
        .then(user => {
            // Generate a QR code for the secret key
            qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
                if (err) res.status(500).json({ error: err.message });
                else res.render('customer/settings', { user, qrCodeUrl: data_url });
            });
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

// Route to verify 2FA code
router.post('/settings/verify-2fa', ensureAuthenticated, (req, res) => {
    const { token } = req.body; // Extract the 2FA token from the request body

    // Verify the token
    const verified = speakeasy.totp.verify({
        secret: req.user.twoFactorSecret,
        encoding: 'base32',
        token
    });

    if (verified) {
        Customer.findByIdAndUpdate(req.user._id, { twoFactorEnabled: true }, { new: true })
            .then(user => res.render('customer/settings', { user, qrCodeUrl: null }))
            .catch(err => res.status(500).json({ error: err.message }));
    } else {
        res.status(400).json({ msg: 'Invalid 2FA token' });
    }
});

// Route to disable 2FA
router.post('/settings/disable-2fa', ensureAuthenticated, (req, res) => {
    Customer.findByIdAndUpdate(req.user._id, { twoFactorEnabled: false, twoFactorSecret: null }, { new: true })
        .then(user => res.render('customer/settings', { user, qrCodeUrl: null }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Route for customer help page
router.get('/help', ensureAuthenticated, (req, res) => {
    res.render('customer/help');
});

module.exports = router;
