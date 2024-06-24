const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const logger = require('morgan');
const path = require('path');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const helmet = require('helmet');
const methodOverride = require('method-override');

require('dotenv').config();
require('./notifications/reminderScheduler');

const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Log environment variables to ensure they are loaded
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('SESSION_SECRET:', process.env.SESSION_SECRET);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(fileUpload());
app.use(methodOverride('_method'));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "'unsafe-inline'", 'data:', 'localhost']
        }
    }
}));

// Body parser middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Configure Express session with MongoDB session store
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

// Initialize Passport middleware for authentication
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

// Initialize Connect Flash middleware for flash messages
app.use(flash());

// Set global variables for flash messages
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    console.log('Flash messages set:', {
        success_msg: res.locals.success_msg,
        error_msg: res.locals.error_msg,
        error: res.locals.error
    });
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('500', { message: 'Internal Server Error' });
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
app.use('/reports', require('./routes/reports')); // Reports routes
app.use('/audit-logs', require('./routes/auditLogs')); // Audit logs route

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Define the port for the server to listen on
const PORT = process.env.PORT || 5000;

// Start the server and listen on the defined port
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
