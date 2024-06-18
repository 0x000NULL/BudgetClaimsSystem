const express = require('express');
const router = express.Router();

// Root route
router.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

// Help route
router.get('/help', (req, res) => {
    res.render('help', { title: 'Help' });
});

// Dashboard route
router.get('/dashboard', (req, res) => {
    res.render('dashboard', { title: 'Dashboard' });
});

// Login route
router.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

// Register route
router.get('/register', (req, res) => {
    res.render('register', { title: 'Register' });
});

// User management route
router.get('/user-management', (req, res) => {
    res.render('user_management', { title: 'User Management' });
});

// Reports route
router.get('/reports', (req, res) => {
    res.render('reports', { title: 'Reports' });
});

// Logout route
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

module.exports = router;
