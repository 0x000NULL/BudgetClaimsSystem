const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const speakeasy = require('speakeasy'); // Import Speakeasy for 2FA
const qrcode = require('qrcode'); // Import QRCode for generating QR codes
const logActivity = require('../middleware/activityLogger'); // Import activity logging middleware
const router = express.Router();

// Route to register a new user, accessible only by admin
router.post('/register', ensureAuthenticated, ensureRole('admin'), logActivity('Registered new user'), (req, res) => {
    const { name, email, password, role } = req.body;
    let errors = [];

    // Check required fields
    if (!name || !email || !password || !role) {
        errors.push({ msg: 'Please enter all fields' });
    }

    // Handle errors if any
    if (errors.length > 0) {
        res.status(400).json({ errors });
    } else {
        // Check if user with the email already exists
        User.findOne({ email: email }).then(user => {
            if (user) {
                res.status(400).json({ msg: 'Email already exists' });
            } else {
                // Create a new user
                const newUser = new User({ name, email, password, role });

                // Hash password before saving
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if (err) throw err;
                        newUser.password = hash;
                        newUser.save()
                            .then(user => res.json({ msg: 'User registered' }))
                            .catch(err => console.log(err));
                    });
                });
            }
        });
    }
});

// Route to login a user
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) throw err;
        if (!user) res.status(400).json({ msg: 'No user exists' });
        else {
            req.logIn(user, err => {
                if (err) throw err;
                if (user.twoFactorEnabled) {
                    res.json({ twoFactorRequired: true }); // Indicate that 2FA is required
                } else {
                    const token = jwt.sign({ id: user._id }, 'your_jwt_secret', { expiresIn: '1h' });
                    res.json({ token });
                }
            });
        }
    })(req, res, next);
});

// Route to setup 2FA
router.post('/setup-2fa', ensureAuthenticated, (req, res) => {
    const secret = speakeasy.generateSecret({ length: 20 }); // Generate a secret key

    // Save the secret key to the user's account
    User.findByIdAndUpdate(req.user._id, { twoFactorSecret: secret.base32 }, { new: true })
        .then(user => {
            // Generate a QR code for the secret key
            qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
                if (err) res.status(500).json({ error: err.message });
                else res.json({ secret: secret.base32, qrCodeUrl: data_url });
            });
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

// Route to verify 2FA code
router.post('/verify-2fa', ensureAuthenticated, (req, res) => {
    const { token } = req.body; // Extract the 2FA token from the request body

    // Verify the token
    const verified = speakeasy.totp.verify({
        secret: req.user.twoFactorSecret,
        encoding: 'base32',
        token
    });

    if (verified) {
        User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: true }, { new: true })
            .then(user => res.json({ msg: '2FA enabled', user }))
            .catch(err => res.status(500).json({ error: err.message }));
    } else {
        res.status(400).json({ msg: 'Invalid 2FA token' });
    }
});

// Route to login with 2FA
router.post('/login-2fa', (req, res) => {
    const { email, password, token } = req.body; // Extract email, password, and 2FA token from the request body

    User.findOne({ email }).then(user => {
        if (!user) res.status(400).json({ msg: 'No user exists' });
        else {
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) throw err;
                if (!isMatch) res.status(400).json({ msg: 'Incorrect password' });
                else {
                    const verified = speakeasy.totp.verify({
                        secret: user.twoFactorSecret,
                        encoding: 'base32',
                        token
                    });

                    if (verified) {
                        const token = jwt.sign({ id: user._id }, 'your_jwt_secret', { expiresIn: '1h' });
                        res.json({ token });
                    } else {
                        res.status(400).json({ msg: 'Invalid 2FA token' });
                    }
                }
            });
        }
    });
});

// Route to modify user permissions, accessible only by admin
router.post('/permissions', ensureAuthenticated, ensureRole('admin'), logActivity('Modified user permissions'), (req, res) => {
    const { userId, role } = req.body;
    User.findByIdAndUpdate(userId, { role }, { new: true }, (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message }); // Handle errors
        }
        res.json({ msg: 'User role updated', user }); // Respond with the updated user
    });
});

module.exports = router;
