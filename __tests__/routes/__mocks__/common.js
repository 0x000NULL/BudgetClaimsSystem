/**
 * @fileoverview Common mock utilities for route tests
 * This file contains reusable mock functions and objects for testing routes
 */

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');

// Mock ObjectId
const mockObjectId = '507f1f77bcf86cd799439011';

// Mock middleware setup
const setupMiddleware = (app) => {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Mock session
    app.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false
    }));
    
    // Mock flash
    app.use(flash());
    
    // Setup locals and flash messages
    app.use((req, res, next) => {
        res.locals.success_msg = req.flash('success_msg');
        res.locals.error_msg = req.flash('error_msg');
        res.locals.error = req.flash('error');
        res.locals.user = req.user;
        next();
    });

    // Mock app.locals
    app.locals = {
        uploadsPath: '/tmp/uploads',
        cache: {
            get: jest.fn().mockReturnValue(null),
            set: jest.fn().mockReturnValue(true),
            del: jest.fn().mockReturnValue(true)
        }
    };
};

// Mock authenticated user middleware
const mockAuthMiddleware = (role = 'admin') => {
    return (req, res, next) => {
        req.user = { 
            _id: mockObjectId, 
            email: 'test@example.com',
            name: 'Test User',
            role: role 
        };
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        next();
    };
};

// Create a mock error handler
const mockErrorHandler = (app) => {
    app.use((err, req, res, next) => {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    });
};

// Mock function for logActivity middleware
const mockLogActivity = (action) => {
    return jest.fn((req, res, next) => {
        console.log(`Mocked logActivity: ${action}`);
        next();
    });
};

// Mock function for ensureRole middleware
const mockEnsureRole = (role) => {
    return jest.fn((req, res, next) => {
        console.log(`Mocked ensureRole: ${role}`);
        next();
    });
};

module.exports = {
    mockObjectId,
    setupMiddleware,
    mockAuthMiddleware,
    mockErrorHandler,
    mockLogActivity,
    mockEnsureRole
}; 