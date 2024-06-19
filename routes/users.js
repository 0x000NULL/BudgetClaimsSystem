const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
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
    const { name, email, password, role } = req.body;
    let errors = [];

    // Basic validation
    if (!name || !email || !password || !role) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters' });
    }

    if (errors.length > 0) {
        console.log('Validation errors:', errors); // Log validation errors
        res.render('register', {
            errors,
            name,
            email,
            password,
            role
        });
    } else {
        // Check if user exists
        try {
            let user = await User.findOne({ email: email });
            if (user) {
                errors.push({ msg: 'Email already exists' });
                console.log('Email already exists:', email); // Log existing email
                res.render('register', {
                    errors,
                    name,
                    email,
                    password,
                    role
                });
            } else {
                const newUser = new User({
                    name,
                    email,
                    password,
                    role
                });

                // Hash password before saving in database
                bcrypt.genSalt(10, (err, salt) => {
                    if (err) throw err;
                    bcrypt.hash(newUser.password, salt, async (err, hash) => {
                        if (err) throw err;
                        // Set hashed password
                        newUser.password = hash;

                        // Save new user to the database
                        try {
                            await newUser.save();
                            console.log('New user registered:', newUser); // Log new user registration
                            req.flash('success_msg', 'You are now registered and can log in');
                            res.redirect('/users/login');
                        } catch (err) {
                            console.error('Error during user registration:', err);
                            res.status(500).json({ error: err.message });
                        }
                    });
                });
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

// Render edit user page
router.get('/:id/edit', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const userId = req.params.id;
    console.log(`Fetching user for editing with ID: ${userId}`); // Log fetching user

    try {
        const user = await User.findById(userId);
        if (!user) {
            console.error(`User with ID ${userId} not found`);
            return res.status(404).render('404', { message: 'User not found' });
        }
        console.log(`User fetched for editing: ${user}`);
        res.render('edit_user', { title: 'Edit User', user });
    } catch (err) {
        console.error(`Error fetching user for editing: ${err}`);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

// Handle edit user POST request
router.post('/:id/edit', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const userId = req.params.id;
    const { name, email, password, role } = req.body;
    console.log(`Updating user with ID: ${userId}`); // Log updating user

    try {
        const user = await User.findById(userId);
        if (!user) {
            console.error(`User with ID ${userId} not found`);
            return res.status(404).json({ error: 'User not found' });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();
        console.log('User updated:', user); // Log user update
        req.flash('success_msg', 'User updated successfully');
        res.redirect('/user-management');
    } catch (err) {
        console.error(`Error updating user: ${err}`);
        res.status(500).json({ error: err.message });
    }
});

// Handle delete user POST request
router.post('/delete/:id', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const userId = req.params.id;
    console.log(`Deleting user with ID: ${userId}`); // Log deleting user

    try {
        await User.findByIdAndDelete(userId);
        console.log(`User with ID ${userId} deleted`);
        req.flash('success_msg', 'User deleted successfully');
        res.redirect('/user-management');
    } catch (err) {
        console.error(`Error deleting user: ${err}`);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
