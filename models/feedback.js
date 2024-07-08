// Import necessary modules
const express = require('express'); // Import Express to create a router
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware
const logActivity = require('../middleware/activityLogger'); // Import activity logging middleware

// Create a new router
const router = express.Router();

// Debug log to check if the ensureRoles middleware is being loaded correctly
console.log("Feedback route - ensureRoles:", ensureRoles);

// Route to view feedback, accessible by admin and manager
// Middleware chain: ensureAuthenticated -> ensureRoles -> logActivity -> route handler
router.get('/',
    ensureAuthenticated, // Middleware to ensure the user is authenticated
    ensureRoles(['admin', 'manager']), // Middleware to ensure the user has the 'admin' or 'manager' role
    logActivity('Viewed feedback'), // Middleware to log the activity with the message 'Viewed feedback'
    (req, res) => {
        // Render the feedback page with a title
        res.render('feedback', { title: 'Feedback' });
    }
);

// Export the router to be used in other parts of the application
module.exports = router;
