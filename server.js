/**
 * @file server.js
 * @description Main server file for the Budget Claims System application. Sets up the Express server, connects to MongoDB, configures middleware, and defines routes.
 * 
 * @requires express
 * @requires mongoose
 * @requires passport
 * @requires express-session
 * @requires connect-mongo
 * @requires connect-flash
 * @requires path
 * @requires cors
 * @requires express-fileupload
 * @requires helmet
 * @requires method-override
 * @requires ./routes/export
 * @requires ./routes/auditLogs
 * @requires express-pino-logger
 * @requires ./logger
 * @requires dotenv/config
 * @requires ./notifications/reminderScheduler
 * @requires ./config/passport
 * @requires ./routes/index
 * @requires ./routes/users
 * @requires ./routes/claims
 * @requires ./routes/dashboard
 * @requires ./routes/api
 * @requires ./routes/feedback
 * @requires ./routes/customers
 * @requires ./routes/employees
 * @requires ./routes/email
 * @requires ./routes/reports
 * @requires ./routes/emailTemplates
 * @requires ./routes/import
 * @requires ./models/Settings
 * 
 * @constant {object} app - The Express application instance.
 * @constant {object} pinoLogger - The Pino logger instance.
 * @constant {number} PORT - The port number on which the server listens.
 * 
 * @function
 * @name connectMongoDB
 * @description Connects to MongoDB using Mongoose and logs the connection status.
 * 
 * @function
 * @name configureMiddleware
 * @description Configures various middleware for the Express application, including JSON parsing, URL encoding, CORS, file uploads, method override, and security settings.
 * 
 * @function
 * @name configureSession
 * @description Configures the Express session with a MongoDB session store.
 * 
 * @function
 * @name configurePassport
 * @description Initializes and configures Passport for authentication.
 * 
 * @function
 * @name configureFlashMessages
 * @description Sets up Connect Flash middleware for flash messages and makes them available in all views.
 * 
 * @function
 * @name configureErrorHandling
 * @description Sets up error handling middleware to catch and display errors.
 * 
 * @function
 * @name configureRoutes
 * @description Defines route handlers for various application routes, including home, users, claims, dashboard, API, feedback, customers, employees, email, reports, audit logs, email templates, export, and import.
 * 
 * @function
 * @name startServer
 * @description Starts the Express server and listens on the specified port.
 */
// Import necessary modules
const express = require('express'); // Framework for building web applications
const mongoose = require('mongoose'); // MongoDB object modeling tool
const passport = require('passport'); // Authentication middleware
const session = require('express-session'); // Session middleware
const MongoStore = require('connect-mongo'); // MongoDB session store for Express
const flash = require('connect-flash'); // Middleware for flash messages
const path = require('path'); // Utility for handling and transforming file paths
const cors = require('cors'); // Middleware for enabling CORS (Cross-Origin Resource Sharing)
const fileUpload = require('express-fileupload'); // Middleware for handling file uploads
const helmet = require('helmet'); // Security middleware
const methodOverride = require('method-override'); // Middleware to support PUT and DELETE methods via POST
const exportRoutes = require('./routes/export'); // Custom routes for export functionality
const auditLogRoutes = require('./routes/auditLogs'); // Custom routes for audit logs
const pinoHttp = require('pino-http'); // HTTP logging middleware for Pino
const pinoLogger = require('./logger'); // Custom Pino logger initialization
const crypto = require('crypto'); // Module for generating cryptographic hash values
const Settings = require('./models/Settings');
const https = require('https');
const fs = require('fs');

// Load environment variables from a .env file
require('dotenv').config();
console.log('Environment variables:', {
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    MONGO_URI: process.env.MONGO_URI,
    SESSION_SECRET: process.env.SESSION_SECRET,
    JWT_SECRET: process.env.JWT_SECRET
});
// Initialize reminder scheduler for notifications
require('./notifications/reminderScheduler');

// Define global settings variables
global.MAX_FILE_SIZES = {
    photos: 5 * 1024 * 1024,    // Default 5MB
    documents: 10 * 1024 * 1024, // Default 10MB
    invoices: 10 * 1024 * 1024   // Default 10MB
};

global.MAX_FILES_PER_CATEGORY = {
    photos: 10,    // Default 10 files
    documents: 5,  // Default 5 files
    invoices: 5    // Default 5 files
};

global.ALLOWED_FILE_TYPES = {
    photos: ['.jpg', '.jpeg', '.png'],
    documents: ['.pdf', '.doc', '.docx'],
    invoices: ['.pdf', '.jpg', '.jpeg', '.png']
};

// Initialize the Express application
const app = express();

// Initialize Pino logger middleware
app.use(pinoHttp({ logger: pinoLogger }));

// Set EJS as the view engine for rendering HTML views
app.set('view engine', 'ejs');

// Log environment variables to ensure they are loaded correctly
pinoLogger.info('MONGO_URI:', process.env.MONGO_URI);
pinoLogger.info('SESSION_SECRET:', process.env.SESSION_SECRET);

// Connect to MongoDB using Mongoose
mongoose.connect(process.env.MONGO_URI, {})
    .then(() => {
        pinoLogger.info('MongoDB connected');
        return loadSettings(); // Load settings after successful connection
    })
    .catch(err => pinoLogger.error('MongoDB connection error:', err));

// Middleware setup
app.use(express.json()); // Parse incoming JSON requests
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies
app.use(cors()); // Enable CORS
app.use(fileUpload()); // Enable file uploads
app.use(methodOverride('_method')); // Allow PUT and DELETE methods via POST
if (process.env.NODE_ENV === 'production') {
    // Production security settings
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    'https://cdn.jsdelivr.net'
                ],
                styleSrc: [
                    "'self'",
                    'https://cdn.jsdelivr.net',
                    "'unsafe-inline'"
                ],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
                sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin']
            }
        }
    }));
} else {
    // Development security settings - more permissive
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'", "http:", "https:"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http:", "https:"],
                styleSrc: ["'self'", "'unsafe-inline'", "http:", "https:"],
                imgSrc: ["'self'", "data:", "http:", "https:"],
                connectSrc: ["'self'", "http:", "https:"],
                fontSrc: ["'self'", "http:", "https:", "data:"],
                objectSrc: ["'self'", "http:", "https:"],
                mediaSrc: ["'self'", "http:", "https:"],
                frameSrc: ["'self'", "http:", "https:"],
                upgradeInsecureRequests: null  // Disable automatic HTTPS upgrade
            }
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: false,
        crossOriginOpenerPolicy: false,
        strictTransportSecurity: false // Disable HSTS in development
    }));
}

// Test and populate the logfile with all log levels
pinoLogger.fatal('This is a fatal log'); // Severe error causing system shutdown
pinoLogger.error('This is an error log'); // Error event but the system continues running
pinoLogger.warn('This is a warning log'); // Potential issue to be aware of
pinoLogger.info('This is an info log'); // General information about system operations
pinoLogger.debug('This is a debug log'); // Detailed information useful for debugging
pinoLogger.trace('This is a trace log'); // Very fine-grained debugging information

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure Express session with MongoDB session store
app.use(session({
    secret: process.env.SESSION_SECRET, // Secret for signing the session ID cookie
    resave: false, // Do not save session if unmodified
    saveUninitialized: false, // Do not create session until something stored
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }) // Use MongoDB to store session data
}));

// Initialize Passport middleware for authentication
app.use(passport.initialize());
app.use(passport.session());
// Configure Passport with strategies and serialization logic
require('./config/passport')(passport);

// Initialize Connect Flash middleware for flash messages
app.use(flash());

// Set global variables for flash messages, accessible in all views
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user; // Ensure user is set globally for view templates
    pinoLogger.info('Flash messages set:', {
        success_msg: res.locals.success_msg,
        error_msg: res.locals.error_msg,
        error: res.locals.error
    });
    next();
});

// Error handling middleware for catching and displaying errors
app.use((err, req, res, next) => {
    pinoLogger.error(err.stack); // Log the error stack trace
    res.status(500).render('500', { message: 'Internal Server Error' }); // Render a 500 error page
});

// Simplified nonce middleware that only generates and sets the nonce
app.use((req, res, next) => {
    // Generate a new nonce for each request
    const nonce = crypto.randomBytes(16).toString('base64');
    // Set it in res.locals
    res.locals.nonce = nonce;
    next();
});

// Add CSP violation reporting endpoint
app.post('/csp-violation-report', (req, res) => {
    pinoLogger.warn('CSP Violation:', req.body);
    res.status(204).send();
});

// Route handlers
app.use('/', (req, res, next) => {
    pinoLogger.info('Accessing home page route');
    next();
}, require('./routes/index')); // Home page routes
app.use('/users', (req, res, next) => {
    pinoLogger.info('Accessing users route');
    next();
}, require('./routes/users')); // User-related routes
app.use('/claims', (req, res, next) => {
    pinoLogger.info('Accessing claims route');
    next();
}, require('./routes/claims')); // Claim-related routes
app.use('/dashboard', (req, res, next) => {
    pinoLogger.info('Accessing dashboard route');
    next();
}, require('./routes/dashboard')); // Dashboard routes
app.use('/api', (req, res, next) => {
    pinoLogger.info('Accessing API route');
    next();
}, require('./routes/api')); // API routes
app.use('/feedback', (req, res, next) => {
    pinoLogger.info('Accessing feedback route');
    next();
}, require('./routes/feedback')); // Feedback routes
app.use('/customers', (req, res, next) => {
    pinoLogger.info('Accessing customers route');
    next();
}, require('./routes/customers')); // Customer-related routes
app.use('/employee', (req, res, next) => {
    pinoLogger.info('Accessing employee route');
    next();
}, require('./routes/employees')); // Employee-related routes
app.use('/email', (req, res, next) => {
    pinoLogger.info('Accessing email route');
    next();
}, require('./routes/email')); // Email-related routes
app.use('/reports', (req, res, next) => {
    pinoLogger.info('Accessing reports route');
    next();
}, require('./routes/reports')); // Report-related routes
app.use('/audit-logs', (req, res, next) => {
    pinoLogger.info('Accessing audit-logs route');
    next();
}, auditLogRoutes); // Audit log routes
app.use('/email-templates', (req, res, next) => {
    pinoLogger.info('Accessing email-templates route');
    next();
}, require('./routes/emailTemplates')); // Email template routes
app.use('/export', (req, res, next) => {
    pinoLogger.info('Accessing export route');
    next();
}, exportRoutes); // Export functionality routes
app.use('/import', (req, res, next) => {
    pinoLogger.info('Accessing import route');
    next();
}, require('./routes/import')); // Import functionality routes

// Start the server and listen on the specified port
const PORT = process.env.PORT || 5000; // Use the port from environment variables or default to 5000
if (process.env.NODE_ENV === 'production') {
    // SSL configuration
    const sslOptions = {
        key: fs.readFileSync('path/to/your/private-key.pem'),
        cert: fs.readFileSync('path/to/your/certificate.pem')
    };

    // Create HTTPS server
    https.createServer(sslOptions, app).listen(PORT, () => {
        pinoLogger.info(`Secure server running on port ${PORT}`);
    });
} else {
    // Development environment - regular HTTP
    app.listen(PORT, () => {
        pinoLogger.info(`Server running on port ${PORT}`);
    });
}

async function loadSettings() {
    try {
        pinoLogger.info('Loading file settings from database');
        
        const fileSizeSettings = await Settings.findOne({ type: 'fileSize' });
        if (fileSizeSettings) {
            Object.assign(MAX_FILE_SIZES, fileSizeSettings.settings);
            pinoLogger.info('Loaded file size settings:', fileSizeSettings.settings);
        }

        const fileCountSettings = await Settings.findOne({ type: 'fileCount' });
        if (fileCountSettings) {
            Object.assign(MAX_FILES_PER_CATEGORY, fileCountSettings.settings);
            pinoLogger.info('Loaded file count settings:', fileCountSettings.settings);
        }

        const fileTypeSettings = await Settings.findOne({ type: 'fileType' });
        if (fileTypeSettings) {
            Object.assign(ALLOWED_FILE_TYPES, fileTypeSettings.settings);
            pinoLogger.info('Loaded file type settings:', fileTypeSettings.settings);
        }
    } catch (error) {
        pinoLogger.error('Error loading settings:', error);
    }
}
