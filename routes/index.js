const express = require('express'); // Import Express to create a router
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const User = require('../models/User'); // Import the User model to interact with the users collection in MongoDB
const AuditLog = require('../models/AuditLog'); // Import the AuditLog model
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware
const router = express.Router(); // Create a new router

// Home page route
router.get('/', (req, res) => {
    res.redirect('/login');
});

// Login page route
router.get('/login', (req, res) => {
    console.log('Login route accessed'); // Log route access
    res.render('login', { title: 'Login' });
});

// Register page route
router.get('/register', (req, res) => {
    console.log('Register route accessed'); // Log route access
    res.render('register', { title: 'Register' });
});

// Dashboard page route
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

        res.render('dashboard', renderData);
    } catch (err) {
        console.error('Error fetching dashboard data:', err.message); // Log error
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// Help page route
router.get('/help', (req, res) => {
    console.log('Help route accessed'); // Log route access
    res.render('help', { title: 'Help' });
});

// User management route
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

// Reports page route
router.get('/reports', ensureAuthenticated, ensureRoles(['admin', 'manager']), (req, res) => {
    console.log('Reports route accessed'); // Log route access
    res.render('reports', { title: 'Reports' });
});

// Logout route
router.get('/logout', (req, res) => {
    console.log('Logout route accessed'); // Log route access
    req.logout();
    res.redirect('/');
});

// Audit Logs Route
router.get('/audit-logs', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    console.log('Audit Logs route accessed');
    try {
        const auditLogs = await AuditLog.find().populate('user', 'name email').sort({ timestamp: -1 }).exec();
        console.log('Audit logs fetched:', auditLogs);
        res.render('audit_logs', { title: 'Audit Logs', auditLogs });
    } catch (err) {
        console.error('Error fetching audit logs:', err.message);
        res.status(500).json({ error: err.message });
    }
});

//Import routegood!
router.get('/import', (req, res) => {
    res.render('import', { title: 'Import Data - Budget Claims System' });
});

module.exports = router; // Export the router
