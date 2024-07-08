const express = require('express'); // Import Express to create a router
const bcrypt = require('bcryptjs'); // Import Bcrypt for hashing passwords
const passport = require('passport'); // Import Passport for authentication
const jwt = require('jsonwebtoken'); // Import JWT for token generation
const User = require('../models/User'); // Import the User model for employees
const { ensureAuthenticated, ensureRole } = require('../middleware/auth'); // Import authentication middleware
const speakeasy = require('speakeasy'); // Import Speakeasy for 2FA
const qrcode = require('qrcode'); // Import QRCode for generating QR codes
const pinoLogger = require('../logger'); // Import Pino logger

const router = express.Router(); // Create a new router

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

// Route for employee login
router.post('/login', (req, res, next) => {
    logRequest(req, 'Employee login attempt');
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            logRequest(req, 'Error during employee login', { error: err });
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            logRequest(req, 'No employee exists');
            return res.status(400).json({ msg: 'No employee exists' });
        }
        req.logIn(user, err => {
            if (err) {
                logRequest(req, 'Error during login', { error: err });
                return res.status(500).json({ error: err.message });
            }
            if (user.twoFactorEnabled) {
                logRequest(req, 'Two-factor authentication required');
                res.json({ twoFactorRequired: true });
            } else {
                const token = jwt.sign({ id: user._id }, 'your_jwt_secret', { expiresIn: '1h' });
                logRequest(req, 'Login successful, token generated', { token });
                res.json({ token });
            }
        });
    })(req, res, next);
});

// Route for managing employee settings
router.get('/settings', ensureAuthenticated, (req, res) => {
    logRequest(req, 'Accessing employee settings');
    res.render('employee/settings', { user: req.user, qrCodeUrl: null });
});

// Route to reset password
router.post('/settings/reset-password', ensureAuthenticated, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    logRequest(req, 'Password reset attempt');

    User.findById(req.user._id).then(user => {
        bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
            if (err) {
                logRequest(req, 'Error during password comparison', { error: err });
                return res.status(500).json({ error: err.message });
            }
            if (!isMatch) {
                logRequest(req, 'Current password is incorrect');
                return res.status(400).json({ msg: 'Current password is incorrect' });
            }
            bcrypt.genSalt(10, (err, salt) => {
                if (err) {
                    logRequest(req, 'Error generating salt for password hashing', { error: err });
                    return res.status(500).json({ error: err.message });
                }
                bcrypt.hash(newPassword, salt, (err, hash) => {
                    if (err) {
                        logRequest(req, 'Error hashing new password', { error: err });
                        return res.status(500).json({ error: err.message });
                    }
                    user.password = hash;
                    user.save()
                        .then(() => {
                            logRequest(req, 'Password reset successful');
                            res.json({ msg: 'Password reset successful' });
                        })
                        .catch(err => {
                            logRequest(req, 'Error saving new password', { error: err });
                            res.status(500).json({ error: err.message });
                        });
                });
            });
        });
    }).catch(err => {
        logRequest(req, 'Error finding user for password reset', { error: err });
        res.status(500).json({ error: err.message });
    });
});

// Route to setup 2FA
router.post('/settings/setup-2fa', ensureAuthenticated, (req, res) => {
    logRequest(req, '2FA setup attempt');
    const secret = speakeasy.generateSecret({ length: 20 });

    User.findByIdAndUpdate(req.user._id, { twoFactorSecret: secret.base32 }, { new: true })
        .then(user => {
            qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
                if (err) {
                    logRequest(req, 'Error generating QR code for 2FA', { error: err });
                    return res.status(500).json({ error: err.message });
                }
                logRequest(req, '2FA setup successful, QR code generated');
                res.render('employee/settings', { user, qrCodeUrl: data_url });
            });
        })
        .catch(err => {
            logRequest(req, 'Error saving 2FA secret to user', { error: err });
            res.status(500).json({ error: err.message });
        });
});

// Route to verify 2FA code
router.post('/settings/verify-2fa', ensureAuthenticated, (req, res) => {
    logRequest(req, '2FA verification attempt');
    const { token } = req.body;

    const verified = speakeasy.totp.verify({
        secret: req.user.twoFactorSecret,
        encoding: 'base32',
        token
    });

    if (verified) {
        User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: true }, { new: true })
            .then(user => {
                logRequest(req, '2FA verification successful, 2FA enabled');
                res.render('employee/settings', { user, qrCodeUrl: null });
            })
            .catch(err => {
                logRequest(req, 'Error enabling 2FA for user', { error: err });
                res.status(500).json({ error: err.message });
            });
    } else {
        logRequest(req, 'Invalid 2FA token');
        res.status(400).json({ msg: 'Invalid 2FA token' });
    }
});

// Route to disable 2FA
router.post('/settings/disable-2fa', ensureAuthenticated, (req, res) => {
    logRequest(req, '2FA disable attempt');
    User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: false, twoFactorSecret: null }, { new: true })
        .then(user => {
            logRequest(req, '2FA disabled successfully');
            res.render('employee/settings', { user, qrCodeUrl: null });
        })
        .catch(err => {
            logRequest(req, 'Error disabling 2FA for user', { error: err });
            res.status(500).json({ error: err.message });
        });
});

module.exports = router; // Export the router
