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
const expressPino = require('express-pino-logger'); // Express logging middleware for Pino
const pinoLogger = require('./logger'); // Custom Pino logger initialization

// Load environment variables from a .env file
require('dotenv').config();
// Initialize reminder scheduler for notifications
require('./notifications/reminderScheduler');

// Initialize the Express application
const app = express();

// Initialize Pino logger middleware
app.use(expressPino({ logger: pinoLogger }));

// Set EJS as the view engine for rendering HTML views
app.set('view engine', 'ejs');

// Log environment variables to ensure they are loaded correctly
pinoLogger.info('MONGO_URI:', process.env.MONGO_URI);
pinoLogger.info('SESSION_SECRET:', process.env.SESSION_SECRET);

// Connect to MongoDB using Mongoose
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true, // Use the new URL parser
    useUnifiedTopology: true // Use the new Server Discover and Monitoring engine
})
    .then(() => pinoLogger.info('MongoDB connected')) // Log successful connection
    .catch(err => pinoLogger.error('MongoDB connection error:', err)); // Log connection errors

// Middleware setup
app.use(express.json()); // Parse incoming JSON requests
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies
app.use(cors()); // Enable CORS
app.use(fileUpload()); // Enable file uploads
app.use(methodOverride('_method')); // Allow PUT and DELETE methods via POST
app.use(helmet({ // Security middleware configuration
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "data:", "http://localhost"], // Allow self and data URLs for default source
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"], // Allow inline scripts and scripts from jsdelivr CDN
            styleSrc: ["'self'", "'unsafe-inline'"] // Allow inline styles
        }
    }
}));

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
app.listen(PORT, () => {
    pinoLogger.info(`Server running on port ${PORT}`); // Log the port the server is running on
});
