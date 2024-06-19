const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User'); // Import the User model
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware

// Render login page
router.get('/login', (req, res) => {
    console.log('Login route accessed'); // Log route access
    res.render('login', { title: 'Login' });
});

// Handle login POST request
router.post('/login', (req, res, next) => {
    console.log('Login POST request received'); // Log login attempt
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/users/login',
        failureFlash: true
    })(req, res, next);
});

// Render register page
router.get('/register', (req, res) => {
    console.log('Register route accessed'); // Log route access
    res.render('register', { title: 'Register' });
});

// Handle registration POST request
router.post('/register', async (req, res) => {
    console.log('Register POST request received'); // Log registration attempt
    const { name, email, password, password2 } = req.body;
    let errors = [];

    // Basic validation
    if (!name || !email || !password || !password2) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    if (password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters' });
    }

    if (errors.length > 0) {
        res.render('register', {
            errors,
            name,
            email,
            password,
            password2
        });
    } else {
        // Check if user exists
        try {
            let user = await User.findOne({ email: email });
            if (user) {
                errors.push({ msg: 'Email already exists' });
                res.render('register', {
                    errors,
                    name,
                    email,
                    password,
                    password2
                });
            } else {
                const newUser = new User({
                    name,
                    email,
                    password
                });

                // Save new user to the database
                await newUser.save();
                req.flash('success_msg', 'You are now registered and can log in');
                res.redirect('/users/login');
            }
        } catch (err) {
            console.error('Error during user registration:', err);
            res.status(500).json({ error: err.message });
        }
    }
});

// Handle logout
router.get('/logout', (req, res) => {
    console.log('Logout route accessed'); // Log route access
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
});

// User Management Route
router.get('/user-management', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    console.log('User Management route accessed'); // Log route access
    try {
        const users = await User.find(); // Fetch all users
        console.log('Users fetched:', users); // Debug log fetched users
        res.render('user_management', { title: 'User Management', users });
    } catch (err) {
        console.error('Error fetching users:', err.message); // Log error
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

module.exports = router;
