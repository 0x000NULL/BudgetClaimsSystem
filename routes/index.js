const express = require('express'); // Import Express to create a router
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const User = require('../models/User'); // Import the User model to interact with the users collection in MongoDB
const AuditLog = require('../models/AuditLog'); // Import the AuditLog model to interact with audit logs
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware
const router = express.Router(); // Create a new router

// Home page route
// Redirects to the login page
router.get('/', (req, res) => {
    res.redirect('/login'); // Redirect to the login page
});

// Login page route
router.get('/login', (req, res) => {
    console.log('Login route accessed'); // Log route access
    res.render('login', { title: 'Login' }); // Render the login page with the title 'Login'
});

// Register page route
router.get('/register', (req, res) => {
    console.log('Register route accessed'); // Log route access
    res.render('register', { title: 'Register' }); // Render the register page with the title 'Register'
});

// Dashboard page route
// Only accessible to authenticated users with 'admin' or 'manager' roles
router.get('/dashboard', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    console.log('Dashboard route accessed'); // Log route access
    try {
        // Fetch total number of claims
        const totalClaims = await Claim.countDocuments();
        console.log('Total Claims:', totalClaims); // Debug log total claims

        // Fetch number of claims by status
        const openClaims = await Claim.countDocuments({ status: 'Open' });
        console.log('Open Claims:', openClaims); // Debug log open claims

        const inProgressClaims = await Claim.countDocuments({ status: 'In Progress' });
        console.log('In Progress Claims:', inProgressClaims); // Debug log in progress claims

        const closedClaims = await Claim.countDocuments({ status: 'Closed' });
        console.log('Closed Claims:', closedClaims); // Debug log closed claims

        // Calculate average resolution time
        const closedClaimsWithResolutionTime = await Claim.find({ status: 'Closed' });
        let totalResolutionTime = 0;
        closedClaimsWithResolutionTime.forEach(claim => {
            const resolutionTime = (claim.updatedAt - claim.createdAt) / (1000 * 60 * 60 * 24); // Time in days
            totalResolutionTime += resolutionTime;
        });
        const avgResolutionTime = closedClaimsWithResolutionTime.length ? totalResolutionTime / closedClaimsWithResolutionTime.length : 0;
        console.log('Average Resolution Time:', avgResolutionTime); // Debug log average resolution time

        // Render the dashboard view with the analytics data
        const renderData = {
            title: 'Dashboard - Budget Claims System',
            totalClaims,
            openClaims,
            inProgressClaims,
            closedClaims,
            avgResolutionTime
        };
        console.log('Render Data:', renderData); // Debug log render data

        res.render('dashboard', renderData); // Render the dashboard page with analytics data
    } catch (err) {
        console.error('Error fetching dashboard data:', err.message); // Log error
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// Help page route
router.get('/help', (req, res) => {
    console.log('Help route accessed'); // Log route access
    res.render('help', { title: 'Help' }); // Render the help page with the title 'Help'
});

// User management route
// Only accessible to authenticated users with 'admin' role
router.get('/user-management', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    console.log('User Management route accessed'); // Log route access
    try {
        const users = await User.find(); // Fetch all users from the database
        console.log('Users fetched:', users); // Debug log fetched users
        res.render('user_management', { title: 'User Management', users }); // Render the user management page with fetched users
    } catch (err) {
        console.error('Error fetching users:', err.message); // Log error
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// Reports page route
// Only accessible to authenticated users with 'admin' or 'manager' roles
router.get('/reports', ensureAuthenticated, ensureRoles(['admin', 'manager']), (req, res) => {
    console.log('Reports route accessed'); // Log route access
    res.render('reports', { title: 'Reports' }); // Render the reports page with the title 'Reports'
});

// Logout route
router.get('/logout', (req, res) => {
    console.log('Logout route accessed'); // Log route access
    req.logout(); // Logout the user
    res.redirect('/'); // Redirect to the home page
});

// Audit Logs Route
// Only accessible to authenticated users with 'admin' role
router.get('/audit-logs', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    console.log('Audit Logs route accessed'); // Log route access
    try {
        const auditLogs = await AuditLog.find().populate('user', 'name email').sort({ timestamp: -1 }).exec(); // Fetch all audit logs, populate user details, and sort by timestamp
        console.log('Audit logs fetched:', auditLogs); // Debug log fetched audit logs
        res.render('audit_logs', { title: 'Audit Logs', auditLogs }); // Render the audit logs page with fetched audit logs
    } catch (err) {
        console.error('Error fetching audit logs:', err.message); // Log error
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// Import data page route
router.get('/import', (req, res) => {
    res.render('import', { title: 'Import Data - Budget Claims System' }); // Render the import data page with the title 'Import Data - Budget Claims System'
});

module.exports = router; // Export the router
