/**
 * @fileoverview This module defines routes for user management in the Budget Claims System.
 * It includes routes for user registration, login, logout, and user management (accessible only by admin).
 * It also configures Passport.js for local authentication and integrates Pino logger for request logging.
 * 
 * @module routes/users
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const pinoLogger = require('../logger'); // Import Pino logger
const router = express.Router();

// Define sensitive fields that should not be logged
const sensitiveFields = ['password', 'token', 'ssn'];

const filterSensitiveData = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    return Object.keys(data).reduce((filteredData, key) => {
        if (sensitiveFields.includes(key)) {
            filteredData[key] = '***REDACTED***';
        } else if (typeof data[key] === 'object') {
            filteredData[key] = filterSensitiveData(data[key]);
        } else {
            filteredData[key] = data[key];
        }
        return filteredData;
    }, {});
};

const logRequest = (req, message, extra = {}) => {
    const { method, originalUrl, headers, body } = req;
    const filteredBody = filterSensitiveData(body);

    pinoLogger.info({
        message,
        user: req.user ? req.user.email : 'Unauthenticated',
        ip: req.ip,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString(),
        method,
        url: originalUrl,
        requestBody: filteredBody,
        headers: headers
    });
};

// Passport Local Strategy Configuration
passport.use(new LocalStrategy({
    usernameField: 'email',
    passReqToCallback: true // This enables passing `req` to the callback
}, async (req, email, password, done) => {
    logRequest(req, 'Authenticating user:', { email });

    try {
        // Find the user by email using async/await syntax
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            logRequest(req, 'No user found with email:', { email });
            return done(null, false, { message: 'That email is not registered' });
        }

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        logRequest(req, 'Password match status:', { isMatch });

        if (isMatch) {
            return done(null, user);
        } else {
            return done(null, false, { message: 'Password incorrect' });
        }
    } catch (err) {
        logRequest(req, 'Error fetching user or comparing passwords:', { error: err });
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

router.get('/register', (req, res) => {
    logRequest(req, 'Register route accessed');
    res.render('register', { title: 'Register' });
});

router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    logRequest(req, 'Register POST request received', { data: req.body });

    let errors = [];

    if (errors.length > 0) {
        logRequest(req, 'Validation errors:', { errors });
        res.render('register', { errors, name, email, password, role });
    } else {
        try {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                errors.push({ msg: 'Email already exists' });
                logRequest(req, 'Email already exists', { email });
                return res.render('register', { errors, name, email, password, role });
            }

            const newUser = new User({ name, email, password, role });
            await newUser.save();
            logRequest(req, 'New user registered:', { newUser });
            req.flash('success_msg', 'You are now registered and can log in');
            res.redirect('/login');
        } catch (err) {
            logRequest(req, 'Error saving new user:', { error: err });
            res.status(500).send('Server error');
        }
    }
});

router.get('/login', (req, res) => {
    logRequest(req, 'Login route accessed');
    res.render('login', { title: 'Login' });
});

router.post('/login', (req, res, next) => {
    logRequest(req, 'Login POST request received');
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next);
});

router.get('/logout', (req, res) => {
    logRequest(req, 'Logout route accessed');
    req.logout(err => {
        if (err) return next(err);
        req.flash('success_msg', 'You are logged out');
        res.redirect('/login');
    });
});

router.get('/user-management', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    logRequest(req, 'User Management route accessed');
    try {
        const users = await User.find();
        logRequest(req, 'Users fetched:', { users });
        res.render('user_management', { title: 'User Management', users });
    } catch (err) {
        logRequest(req, 'Error fetching users:', { error: err });
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/edit', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const userId = req.params.id;
    logRequest(req, `Fetching user details for editing with ID: ${userId}`);

    try {
        const user = await User.findById(userId);
        if (!user) {
            logRequest(req, `User with ID ${userId} not found`, { level: 'error' });
            return res.status(404).render('404', { message: 'User not found' });
        }
        logRequest(req, `User details fetched for editing: ${user}`);
        res.render('edit_user', { title: 'Edit User', user });
    } catch (err) {
        logRequest(req, `Error fetching user details for editing: ${err}`, { error: err });
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

router.put('/:id', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const userId = req.params.id;
    logRequest(req, `Updating user with ID: ${userId}`, { data: req.body });

    try {
        let user = await User.findById(userId);
        if (!user) {
            logRequest(req, `User with ID ${userId} not found`, { level: 'error' });
            return res.status(404).json({ error: 'User not found' });
        }

        const { name, email, role } = req.body;
        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;

        user = await user.save();
        logRequest(req, 'User updated:', { user });
        res.redirect('/user-management');
    } catch (err) {
        logRequest(req, `Error updating user: ${err}`, { error: err });
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const userId = req.params.id;
    logRequest(req, `Deleting user with ID: ${userId}`);

    try {
        await User.findByIdAndDelete(userId);
        logRequest(req, 'User deleted:', { userId });
        res.redirect('/user-management');
    } catch (err) {
        logRequest(req, 'Error deleting user:', { error: err });
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
