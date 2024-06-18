// Import required modules
const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Create a new router
const router = express.Router();

// Route to register a new user
router.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    let errors = [];

    // Check if all fields are provided
    if (!name || !email || !password) {
        errors.push({ msg: 'Please enter all fields' });
    }

    // If there are errors, return them
    if (errors.length > 0) {
        res.status(400).json({ errors });
    } else {
        // Check if the email is already registered
        User.findOne({ email: email }).then(user => {
            if (user) {
                res.status(400).json({ msg: 'Email already exists' });
            } else {
                const newUser = new User({
                    name,
                    email,
                    password
                });

                // Hash the password before saving the user
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
                res.json({ token });
            });
        }
    })(req, res, next);
});

// Export the router
module.exports = router;
