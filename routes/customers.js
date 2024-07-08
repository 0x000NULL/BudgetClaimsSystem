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

// Route for customer registration
router.post('/register', (req, res) => {
    logRequest(req, 'Customer registration initiated');
    const { name, email, password } = req.body; // Extract registration details from the request body
    let errors = [];

    // Check required fields
    if (!name || !email || !password) {
        errors.push({ msg: 'Please enter all fields' });
        logRequest(req, 'Validation error during registration', { errors });
    }

    // Handle errors if any
    if (errors.length > 0) {
        res.status(400).json({ errors });
    } else {
        // Check if customer with the email already exists
        Customer.findOne({ email }).then(customer => {
            if (customer) {
                logRequest(req, 'Email already exists during registration', { email });
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
                            .then(customer => {
                                logRequest(req, 'Customer registered successfully', { customer });
                                res.json({ msg: 'Customer registered' });
                            })
                            .catch(err => {
                                logRequest(req, 'Error saving new customer', { error: err });
                                res.status(500).json({ error: err.message });
                            });
                    });
                });
            }
        });
    }
});

// Route for customer login
router.post('/login', (req, res, next) => {
    logRequest(req, 'Customer login initiated');
    passport.authenticate('local', (err, customer, info) => {
        if (err) {
            logRequest(req, 'Error during customer authentication', { error: err });
            throw err;
        }
        if (!customer) {
            logRequest(req, 'Customer not found during login', { email: req.body.email });
            res.status(400).json({ msg: 'No customer exists' });
        } else {
            req.logIn(customer, err => {
                if (err) {
                    logRequest(req, 'Error during customer login', { error: err });
                    throw err;
                }
                if (customer.twoFactorEnabled) {
                    logRequest(req, '2FA required for customer login', { customerId: customer._id });
                    res.json({ twoFactorRequired: true }); // Indicate that 2FA is required
                } else {
                    const token = jwt.sign({ id: customer._id }, 'your_jwt_secret', { expiresIn: '1h' });
                    logRequest(req, 'Customer logged in successfully', { customerId: customer._id, token });
                    res.json({ token });
                }
            });
        }
    })(req, res, next);
});

// Route for submitting a new claim
router.post('/claims', ensureAuthenticated, (req, res) => {
    logRequest(req, 'New claim submission initiated');
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
            logRequest(req, 'New claim saved successfully', { claim });
            // Update the customer's claims
            Customer.findByIdAndUpdate(customerId, { $push: { claims: claim._id } })
                .then(() => res.json(claim))
                .catch(err => {
                    logRequest(req, 'Error updating customer claims', { error: err });
                    res.status(500).json({ error: err.message });
                });
        })
        .catch(err => {
            logRequest(req, 'Error saving new claim', { error: err });
            res.status(500).json({ error: err.message });
        }); // Handle errors
});

// Route for viewing customer's claims
router.get('/claims', ensureAuthenticated, (req, res) => {
    logRequest(req, 'Fetching customer claims');
    Claim.find({ customerName: req.user.name })
        .then(claims => {
            logRequest(req, 'Customer claims fetched successfully', { claims });
            res.json(claims);
        })
        .catch(err => {
            logRequest(req, 'Error fetching customer claims', { error: err });
            res.status(500).json({ error: err.message });
        });
});

// Route to view settings page
router.get('/settings', ensureAuthenticated, (req, res) => {
    logRequest(req, 'Accessing customer settings page');
    res.render('customer/settings', { user: req.user, qrCodeUrl: null });
});

// Route to reset password
router.post('/settings/reset-password', ensureAuthenticated, (req, res) => {
    logRequest(req, 'Customer password reset initiated');
    const { currentPassword, newPassword } = req.body; // Extract current and new passwords from the request body

    Customer.findById(req.user._id).then(customer => {
        // Check if current password matches
        bcrypt.compare(currentPassword, customer.password, (err, isMatch) => {
            if (err) throw err;
            if (!isMatch) {
                logRequest(req, 'Current password incorrect during reset', { customerId: req.user._id });
                res.status(400).json({ msg: 'Current password is incorrect' });
            } else {
                // Hash new password before saving
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newPassword, salt, (err, hash) => {
                        if (err) throw err;
                        customer.password = hash;
                        customer.save()
                            .then(() => {
                                logRequest(req, 'Customer password reset successful', { customerId: req.user._id });
                                res.json({ msg: 'Password reset successful' });
                            })
                            .catch(err => {
                                logRequest(req, 'Error saving new password', { error: err });
                                res.status(500).json({ error: err.message });
                            });
                    });
                });
            }
        });
    });
});

// Route to setup 2FA
router.post('/settings/setup-2fa', ensureAuthenticated, (req, res) => {
    logRequest(req, '2FA setup initiated');
    const secret = speakeasy.generateSecret({ length: 20 }); // Generate a secret key

    // Save the secret key to the customer's account
    Customer.findByIdAndUpdate(req.user._id, { twoFactorSecret: secret.base32 }, { new: true })
        .then(user => {
            // Generate a QR code for the secret key
            qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
                if (err) {
                    logRequest(req, 'Error generating QR code for 2FA', { error: err });
                    res.status(500).json({ error: err.message });
                } else {
                    logRequest(req, '2FA setup successful, QR code generated', { user });
                    res.render('customer/settings', { user, qrCodeUrl: data_url });
                }
            });
        })
        .catch(err => {
            logRequest(req, 'Error saving 2FA secret', { error: err });
            res.status(500).json({ error: err.message });
        });
});

// Route to verify 2FA code
router.post('/settings/verify-2fa', ensureAuthenticated, (req, res) => {
    logRequest(req, '2FA verification initiated');
    const { token } = req.body; // Extract the 2FA token from the request body

    // Verify the token
    const verified = speakeasy.totp.verify({
        secret: req.user.twoFactorSecret,
        encoding: 'base32',
        token
    });

    if (verified) {
        logRequest(req, '2FA token verified successfully', { userId: req.user._id });
        Customer.findByIdAndUpdate(req.user._id, { twoFactorEnabled: true }, { new: true })
            .then(user => res.render('customer/settings', { user, qrCodeUrl: null }))
            .catch(err => {
                logRequest(req, 'Error enabling 2FA', { error: err });
                res.status(500).json({ error: err.message });
            });
    } else {
        logRequest(req, 'Invalid 2FA token', { userId: req.user._id });
        res.status(400).json({ msg: 'Invalid 2FA token' });
    }
});

// Route to disable 2FA
router.post('/settings/disable-2fa', ensureAuthenticated, (req, res) => {
    logRequest(req, 'Disabling 2FA');
    Customer.findByIdAndUpdate(req.user._id, { twoFactorEnabled: false, twoFactorSecret: null }, { new: true })
        .then(user => {
            logRequest(req, '2FA disabled successfully', { user });
            res.render('customer/settings', { user, qrCodeUrl: null });
        })
        .catch(err => {
            logRequest(req, 'Error disabling 2FA', { error: err });
            res.status(500).json({ error: err.message });
        });
});

// Route for customer help page
router.get('/help', ensureAuthenticated, (req, res) => {
    logRequest(req, 'Accessing customer help page');
    res.render('customer/help');
});

module.exports = router; // Export the router
