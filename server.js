const express = require('express'); // Import Express to create an application
const mongoose = require('mongoose'); // Import Mongoose for MongoDB interaction
const passport = require('passport'); // Import Passport for authentication
const session = require('express-session'); // Import Express session middleware
const connectMongo = require('connect-mongo'); // Import Connect Mongo for session storage in MongoDB
const flash = require('connect-flash'); // Import Connect Flash for flash messages
const logger = require('morgan'); // Import Morgan for HTTP request logging
const path = require('path'); // Import Path to handle file and directory paths
const cors = require('cors'); // Import CORS middleware
const fileUpload = require('express-fileupload'); // Import Express FileUpload middleware
require('dotenv').config(); // Import and configure dotenv for environment variables

// Import the reminder scheduler to schedule notifications
require('./notifications/reminderScheduler');

const app = express(); // Initialize the Express application

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true, // Use the new URL parser
    useUnifiedTopology: true // Use the new Server Discover and Monitoring engine
})
    .then(() => console.log('MongoDB connected')) // Log success message
    .catch(err => console.log(err)); // Log any connection errors

// Middleware setup
app.use(logger('dev')); // Use Morgan for logging HTTP requests
app.use(express.json()); // Parse incoming JSON requests
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded data
app.use(cors()); // Enable CORS
app.use(fileUpload()); // Enable file uploads

// Configure Express session with MongoDB session store
const MongoStore = connectMongo(session);
app.use(session({
    secret: process.env.SESSION_SECRET, // Session secret key
    resave: false, // Do not save session if unmodified
    saveUninitialized: false, // Do not create session until something is stored
    store: new MongoStore({ mongooseConnection: mongoose.connection }) // Use MongoStore for session storage
}));

// Initialize Passport middleware for authentication
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport); // Import Passport configuration

// Initialize Connect Flash middleware for flash messages
app.use(flash());

// Set global variables for flash messages
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg'); // Success message
    res.locals.error_msg = req.flash('error_msg'); // Error message
    res.locals.error = req.flash('error'); // Error object
    next(); // Continue to the next middleware
});

// Routes
app.use('/', require('./routes/index')); // Root route
app.use('/users', require('./routes/users')); // User routes
app.use('/claims', require('./routes/claims')); // Claim routes
app.use('/dashboard', require('./routes/dashboard')); // Dashboard routes
app.use('/api', require('./routes/api')); // API routes
app.use('/feedback', require('./routes/feedback')); // Feedback routes
app.use('/customer', require('./routes/customers')); // Customer routes
app.use('/employee', require('./routes/employees')); // Employee routes
app.use('/email', require('./routes/email')); // Email routes

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Define the port for the server to listen on
const PORT = process.env.PORT || 5000;

// Start the server and listen on the defined port
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
