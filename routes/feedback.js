const express = require('express'); // Import Express to create a router
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import middleware to ensure authentication and role-based access
const logActivity = require('../middleware/activityLogger'); // Import middleware to log user activities
const router = express.Router(); // Create a new router

// Debugging logs for middleware functions
console.log("Feedback route - ensureAuthenticated:", ensureAuthenticated);
console.log("Feedback route - ensureRoles:", ensureRoles);

// Route to view feedback, accessible only by admin and manager
router.get(
    '/',
    ensureAuthenticated, // Ensure the user is authenticated
    ensureRoles(['admin', 'manager']), // Ensure the user has 'admin' or 'manager' role
    logActivity('Viewed feedback'), // Log the activity with a description 'Viewed feedback'
    (req, res) => {
        // Render the feedback view with a title
        res.render('feedback', { title: 'Feedback' });
    }
);

module.exports = router; // Export the router
