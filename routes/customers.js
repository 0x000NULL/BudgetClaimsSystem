const express = require('express');
const router = express.Router();
const passport = require('passport');
const { isCustomerAuthenticated } = require('../middleware/auth');
const Customer = require('../models/Customer');
const bcrypt = require('bcryptjs');
const pinoLogger = require('../logger');
const Claim = require('../models/Claim');

/**
 * @route GET /customer/login
 * @desc Render customer login page
 * @access Public
 */
router.get('/login', (req, res) => {
    res.render('customer/login', { error: req.flash('error') });
});

/**
 * @route POST /customer/login
 * @desc Authenticate customer
 * @access Public
 */
router.post('/login', passport.authenticate('customer-local', {
    successRedirect: '/customer/dashboard',
    failureRedirect: '/customer/login',
    failureFlash: true
}));

/**
 * @route GET /customer/register
 * @desc Render customer registration page
 * @access Public
 */
router.get('/register', (req, res) => {
    res.render('customer/register', {
        error: req.flash('error'),
        formData: {},
        messages: req.flash('success')
    });
});

/**
 * @route POST /customer/register
 * @desc Register new customer
 * @access Public
 */
router.post('/register', async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        password,
        confirmPassword,
        terms
    } = req.body;

    try {
        // Validation
        const errors = [];

        // Check if terms are accepted
        if (!terms) {
            errors.push('You must accept the Terms and Conditions');
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            errors.push('Passwords do not match');
        }

        // Check if email already exists
        const existingCustomer = await Customer.findOne({ email: email.toLowerCase() });
        if (existingCustomer) {
            errors.push('Email is already registered');
        }

        // If there are validation errors, re-render the form with errors
        if (errors.length > 0) {
            pinoLogger.warn({
                message: 'Customer registration validation failed',
                errors,
                email
            });
            return res.render('customer/register', {
                error: errors,
                formData: req.body
            });
        }

        // Create new customer
        const newCustomer = new Customer({
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            address,
            city,
            state: state.toUpperCase(),
            zipCode,
            password
        });

        // Save customer to database
        await newCustomer.save();

        pinoLogger.info({
            message: 'New customer registered successfully',
            customerId: newCustomer._id,
            email: newCustomer.email
        });

        // Set success flash message
        req.flash('success', 'Registration successful! Please log in.');

        // Redirect to login page
        res.redirect('/customer/login');

    } catch (error) {
        pinoLogger.error({
            message: 'Error during customer registration',
            error: error.message,
            email
        });

        // Handle validation errors from Mongoose
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.render('customer/register', {
                error: validationErrors,
                formData: req.body
            });
        }

        // Handle other errors
        res.render('customer/register', {
            error: ['An error occurred during registration. Please try again.'],
            formData: req.body
        });
    }
});

/**
 * @route GET /customer/dashboard
 * @desc Customer dashboard page
 * @access Private
 */
router.get('/dashboard', isCustomerAuthenticated, async (req, res) => {
    try {
        // Get claims statistics
        const [activeClaims, pendingClaims, completedClaims, recentClaims] = await Promise.all([
            Claim.countDocuments({ customer: req.user._id, status: 'Active' }),
            Claim.countDocuments({ customer: req.user._id, status: 'Pending' }),
            Claim.countDocuments({ customer: req.user._id, status: 'Completed' }),
            Claim.find({ customer: req.user._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()
        ]);

        // Update last login time
        await Customer.findByIdAndUpdate(req.user._id, {
            lastLogin: new Date()
        });

        // Render dashboard with data
        res.render('customer/dashboard', {
            user: req.user,
            activeClaims,
            pendingClaims,
            completedClaims,
            recentClaims,
            messages: req.flash('success')
        });

    } catch (error) {
        pinoLogger.error({
            message: 'Error loading customer dashboard',
            error: error.message,
            customerId: req.user._id
        });

        req.flash('error', 'Error loading dashboard data');
        res.render('customer/dashboard', {
            user: req.user,
            activeClaims: 0,
            pendingClaims: 0,
            completedClaims: 0,
            recentClaims: [],
            messages: req.flash('error')
        });
    }
});

/**
 * @route GET /customer/help
 * @desc Customer help page
 * @access Private
 */
router.get('/help', isCustomerAuthenticated, (req, res) => {
    res.render('customer/help');
});

/**
 * @route GET /customer/settings
 * @desc Customer settings page
 * @access Private
 */
router.get('/settings', isCustomerAuthenticated, (req, res) => {
    res.render('customer/settings');
});

/**
 * @route GET /customer/claims
 * @desc List all customer claims
 * @access Private
 */
router.get('/claims', isCustomerAuthenticated, (req, res) => {
    res.render('customer/claims');
});

/**
 * @route GET /customer/claims/:id
 * @desc View specific claim
 * @access Private
 */
router.get('/claims/:id', isCustomerAuthenticated, (req, res) => {
    res.render('customer/view-claim');
});

/**
 * @route GET /customer/claims/new
 * @desc Show new claim form
 * @access Private
 */
router.get('/claims/new', isCustomerAuthenticated, (req, res) => {
    res.render('customer/submit-claim');
});

/**
 * @route POST /customer/claims/new
 * @desc Submit new claim
 * @access Private
 */
router.post('/claims/new', isCustomerAuthenticated, async (req, res) => {
    // Claim submission logic will be implemented here
});

/**
 * @route GET /customer/logout
 * @desc Logout customer
 * @access Private
 */
router.get('/logout', isCustomerAuthenticated, (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', 'You have been logged out');
        res.redirect('/customer/login');
    });
});

module.exports = router;