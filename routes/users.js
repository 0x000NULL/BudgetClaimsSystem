const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const logActivity = require('../middleware/activityLogger');
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
                const token = jwt.sign({ id: user._id }, 'your_jwt_secret', { expiresIn: '1h' });
                // Log the login activity
                const log = new ActivityLog({
                    user: user._id,
                    action: 'User logged in',
                });
                log.save((err) => {
                    if (err) console.error('Error logging activity:', err);
                });
                res.json({ token });
            });
        }
    })(req, res, next);
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
