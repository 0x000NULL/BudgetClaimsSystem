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
        headers: headers // Log request headers
    });
};

// Passport Local Strategy Configuration
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    logRequest(req, 'Authenticating user:', { email });

    // Find the user by email
    User.findOne({ email: email.toLowerCase() }, (err, user) => {
        if (err) {
            logRequest(req, 'Error fetching user:', { error: err });
            return done(err);
        }
        if (!user) {
            logRequest(req, 'No user found with email:', { email });
            return done(null, false, { message: 'That email is not registered' });
        }

        // Compare the provided password with the stored hashed password
        logRequest(req, 'Comparing passwords', { storedPasswordHash: user.password });

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                logRequest(req, 'Error comparing passwords:', { error: err });
                return done(err);
            }
            logRequest(req, 'Password match status:', { isMatch });

            if (isMatch) {
                return done(null, user); // Password matches, proceed with user authentication
            } else {
                return done(null, false, { message: 'Password incorrect' });
            }
        });
    });
}));

// Serialize user information into the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user information from the session
passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => done(err, user));
});

// Route to display the registration form
router.get('/register', (req, res) => {
    logRequest(req, 'Register route accessed');
    res.render('register', { title: 'Register' });
});

// Route to handle user registration
router.post('/register', (req, res) => {
    const { name, email, password, role } = req.body;
    logRequest(req, 'Register POST request received', { data: req.body });

    // Basic validation
    let errors = [];
    // Uncomment this if block to enable validation for required fields
    // if (!name || !email || !password || !role) {
    //     errors.push({ msg: 'Please enter all fields' });
    // }

    if (errors.length > 0) {
        logRequest(req, 'Validation errors:', { errors });
        res.render('register', { errors, name, email, password, role });
    } else {
        // Check if the user already exists
        User.findOne({ email }).then(user => {
            if (user) {
                errors.push({ msg: 'Email already exists' });
                logRequest(req, 'Email already exists', { email });
                res.render('register', { errors, name, email, password, role });
            } else {
                // Create a new user object
                const newUser = new User({ name, email, password, role });

                // Save the new user to the database
                newUser.save()
                    .then(user => {
                        logRequest(req, 'New user registered:', { user });
                        req.flash('success_msg', 'You are now registered and can log in');
                        res.redirect('/login'); // Redirect to the login page
                    })
                    .catch(err => logRequest(req, 'Error saving new user:', { error: err }));
            }
        });
    }
});

// Route to display the login form
router.get('/login', (req, res) => {
    logRequest(req, 'Login route accessed');
    res.render('login', { title: 'Login' });
});

// Route to handle user login
router.post('/login', (req, res, next) => {
    logRequest(req, 'Login POST request received');
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next);
});

// Route to handle user logout
router.get('/logout', (req, res) => {
    logRequest(req, 'Logout route accessed');
    req.logout(err => {
        if (err) return next(err);
        req.flash('success_msg', 'You are logged out');
        res.redirect('/login');
    });
});

// Route to display user management page (accessible only by admin)
router.get('/user-management', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    logRequest(req, 'User Management route accessed');
    try {
        // Fetch all users from the database
        const users = await User.find();
        logRequest(req, 'Users fetched:', { users });
        res.render('user_management', { title: 'User Management', users });
    } catch (err) {
        logRequest(req, 'Error fetching users:', { error: err });
        res.status(500).json({ error: err.message });
    }
});

// Route to edit user details (accessible only by admin)
router.get('/:id/edit', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const userId = req.params.id;
    logRequest(req, `Fetching user details for editing with ID: ${userId}`);

    try {
        // Find the user by ID
        const user = await User.findById(userId).exec();
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

// Route to handle user update (accessible only by admin)
router.put('/:id', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const userId = req.params.id;
    logRequest(req, `Updating user with ID: ${userId}`, { data: req.body });

    try {
        // Find the user by ID
        let user = await User.findById(userId).exec();
        if (!user) {
            logRequest(req, `User with ID ${userId} not found`, { level: 'error' });
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user details with the new data from the request
        const { name, email, role } = req.body;
        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;

        // Save the updated user details
        user = await user.save();
        logRequest(req, 'User updated:', { user });
        res.redirect('/user-management');
    } catch (err) {
        logRequest(req, `Error updating user: ${err}`, { error: err });
        res.status(500).json({ error: err.message });
    }
});

// Route to handle user deletion (accessible only by admin)
router.delete('/:id', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const userId = req.params.id;
    logRequest(req, `Deleting user with ID: ${userId}`);

    try {
        // Delete the user by ID
        await User.findByIdAndDelete(userId);
        logRequest(req, 'User deleted:', { userId });
        res.redirect('/user-management');
    } catch (err) {
        logRequest(req, 'Error deleting user:', { error: err });
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
