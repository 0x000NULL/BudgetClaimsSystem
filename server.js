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
            defaultSrc: ["'self'", "data:", "http://localhost"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'"]
        }
    }
}));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

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
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/claims', require('./routes/claims'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/api', require('./routes/api'));
app.use('/feedback', require('./routes/feedback'));
app.use('/customer', require('./routes/customers'));
app.use('/employee', require('./routes/employees'));
app.use('/email', require('./routes/email'));
app.use('/reports', require('./routes/reports'));
app.use('/audit-logs', require('./routes/auditLogs'));
app.use('/email-templates', require('./routes/emailTemplates'));
app.use('/export', require('./routes/export'));
app.use('/import', require('./routes/import'));
app.use('/user-management', require('./routes/userManagement'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});  