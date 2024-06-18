// server.js

// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const bodyParser = require('body-parser');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');

const app = express();

// Middleware to enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Middleware to parse JSON bodies
app.use(bodyParser.json());
// Middleware to parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to handle file uploads
app.use(fileUpload());

// Set up EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set up static files
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/BudgetClaimsSystem', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Configure session management
app.use(session({
    secret: 'your_secret_key', // Secret key for signing the session ID cookie
    resave: false, // Prevents session from being saved back to the session store if it wasn't modified
    saveUninitialized: false, // Prevents uninitialized sessions from being saved to the session store
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/BudgetClaimsSystem' }) // Store sessions in MongoDB
}));

// Initialize Passport.js for authentication
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

// Define routes
app.use('/api/claims', require('./routes/claims'));
app.use('/api/users', require('./routes/users'));
app.use('/api/email', require('./routes/email'));

// Serve the landing page
app.get('/', (req, res) => {
    res.render('index');
});

// Serve the login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Handle login form submission
app.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next);
});

// Serve the dashboard page (requires authentication)
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    res.render('dashboard', { user: req.user });
});

// Serve the claims search page
app.get('/claims/search', (req, res) => {
    res.render('claims_search');
});

// Serve the claims view/edit page
app.get('/claims/:id', (req, res) => {
    Claim.findById(req.params.id, (err, claim) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.render('claim_view_edit', { claim });
    });
});

// Handle claim update
app.post('/claims/:id', (req, res) => {
    Claim.findByIdAndUpdate(req.params.id, req.body, (err, claim) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.redirect('/claims/' + req.params.id);
    });
});

// Serve the logout page
app.get('/logout', (req, res) => {
    req.logout();
    res.render('logout');
});

// Serve the help page
app.get('/help', (req, res) => {
    res.render('help');
});

// Serve the user management page
app.get('/users', (req, res) => {
    res.render('user_management');
});

// Handle user creation
app.post('/users/create', (req, res) => {
    const { name, email, password } = req.body;
    const newUser = new User({ name, email, password });
    newUser.save(err => {
        if (err) {
            return res.status(500).send(err);
        }
        res.redirect('/users');
    });
});

// Handle user deletion
app.post('/users/delete', (req, res) => {
    User.findByIdAndDelete(req.body.userId, err => {
        if (err) {
            return res.status(500).send(err);
        }
        res.redirect('/users');
    });
});

// Handle permissions modification
app.post('/users/permissions', (req, res) => {
    User.findByIdAndUpdate(req.body.userId, { permissions: req.body.permissions }, err => {
        if (err) {
            return res.status(500).send(err);
        }
        res.redirect('/users');
    });
});

// Serve the reports page
app.get('/reports', (req, res) => {
    res.render('reports');
});

// Handle report generation
app.post('/reports/generate', (req, res) => {
    const reportType = req.body.reportType;
    // Generate the report based on the selected type (PDF, CSV, Excel)
    res.send('Report generation is not yet implemented.');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
