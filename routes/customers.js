/**
 * @file /home/stripcheese/Desktop/BudgetClaimsSystem/routes/customers.js
 * @description This file contains the routes for customer-related operations in the Budget Claims System.
 * It includes routes for customer registration, login, claim submission, viewing claims, settings management,
 * password reset, and two-factor authentication setup and verification.
 * 
 * @requires express
 * @requires bcryptjs
 * @requires passport
 * @requires jsonwebtoken
 * @requires ../models/Customer
 * @requires ../models/Claim
 * @requires ../middleware/auth
 * @requires speakeasy
 * @requires qrcode
 * @requires ../logger
 */

 /**
 * @typedef {Object} Request
 * @property {Object} body - The request body.
 * @property {Object} user - The authenticated user.
 * @property {string} ip - The IP address of the request.
 * @property {string} sessionID - The session ID of the request.
 * @property {string} method - The HTTP method of the request.
 * @property {string} originalUrl - The original URL of the request.
 * @property {Object} headers - The headers of the request.
 */

 /**
 * @typedef {Object} Response
 * @property {Function} json - Sends a JSON response.
 * @property {Function} status - Sets the HTTP status for the response.
 * @property {Function} render - Renders a view template.
 */

 /**
 * @typedef {Object} NextFunction
 * @description A callback function to pass control to the next middleware function.
 */

 /**
 * @typedef {Object} Customer
 * @property {string} name - The name of the customer.
 * @property {string} email - The email of the customer.
 * @property {string} password - The hashed password of the customer.
 * @property {boolean} twoFactorEnabled - Indicates if two-factor authentication is enabled.
 * @property {string} twoFactorSecret - The secret key for two-factor authentication.
 */

 /**
 * @typedef {Object} Claim
 * @property {string} mva - The MVA of the claim.
 * @property {string} customerName - The name of the customer who submitted the claim.
 * @property {string} description - The description of the claim.
 * @property {string} status - The status of the claim.
 * @property {Array} files - The files associated with the claim.
 */

 /**
 * @typedef {Object} Error
 * @property {string} message - The error message.
 */

 /**
 * @typedef {Object} Logger
 * @property {Function} info - Logs an informational message.
 */

 /**
 * @typedef {Object} QRCode
 * @property {Function} toDataURL - Generates a QR code data URL.
 */

 /**
 * @typedef {Object} Speakeasy
 * @property {Function} generateSecret - Generates a secret key for two-factor authentication.
 * @property {Function} totp.verify - Verifies a TOTP token.
 */

 /**
 * @typedef {Object} Passport
 * @property {Function} authenticate - Authenticates a request using a specified strategy.
 */

 /**
 * @typedef {Object} Bcrypt
 * @property {Function} genSalt - Generates a salt for hashing.
 * @property {Function} hash - Hashes a password.
 * @property {Function} compare - Compares a password with a hash.
 */

 /**
 * @typedef {Object} JWT
 * @property {Function} sign - Generates a JSON Web Token.
 */

 /**
 * @typedef {Object} Express
 * @property {Function} Router - Creates a new router.
 */

 /**
 * @typedef {Object} Middleware
 * @property {Function} ensureAuthenticated - Middleware to ensure the user is authenticated.
 */

 /**
 * @typedef {Object} SensitiveFields
 * @property {Array} sensitiveFields - List of sensitive fields that should not be logged.
 */

 /**
 * @function filterSensitiveData
 * @description Filters out sensitive fields from the request body.
 * @param {Object} data - The data to be filtered.
 * @returns {Object} The filtered data with sensitive fields masked.
 */

 /**
 * @function logRequest
 * @description Logs requests with user and session info.
 * @param {Request} req - The request object.
 * @param {string} message - The log message.
 * @param {Object} [extra={}] - Additional information to log.
 */

 /**
 * @function router.post('/register')
 * @description Route for customer registration.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */

 /**
 * @function router.post('/login')
 * @description Route for customer login.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next middleware function.
 */

 /**
 * @function router.post('/claims')
 * @description Route for submitting a new claim.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */

 /**
 * @function router.get('/claims')
 * @description Route for viewing customer's claims.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */

 /**
 * @function router.get('/settings')
 * @description Route to view settings page.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */

 /**
 * @function router.post('/settings/reset-password')
 * @description Route to reset password.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */

 /**
 * @function router.post('/settings/setup-2fa')
 * @description Route to setup two-factor authentication.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */

 /**
 * @function router.post('/settings/verify-2fa')
 * @description Route to verify two-factor authentication code.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */

 /**
 * @function router.post('/settings/disable-2fa')
 * @description Route to disable two-factor authentication.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */

 /**
 * @function router.get('/help')
 * @description Route for customer help page.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 */

 /**
 * @module routes/customers
 * @description Exports the router for customer-related routes.
 */
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
