const express = require('express'); // Import Express to create a router
const Feedback = require('../models/Feedback'); // Import the Feedback model
const { ensureAuthenticated } = require('../middleware/auth'); // Import authentication middleware
const logActivity = require('../middleware/activityLogger'); // Import activity logging middleware
const router = express.Router(); // Create a new router

// Route to submit feedback
router.post('/', ensureAuthenticated, logActivity('Submitted feedback'), (req, res) => {
    const { message, type } = req.body; // Extract feedback details from the request body
    const userId = req.user._id; // Get the authenticated user's ID

    // Create a new feedback object
    const newFeedback = new Feedback({
        user: userId,
        message,
        type
    });

    // Save the feedback to the database
    newFeedback.save()
        .then(feedback => res.json(feedback)) // Respond with the saved feedback
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

// Route to get all feedback, accessible by admin and manager
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Viewed feedback'), (req, res) => {
    Feedback.find().populate('user', 'name email')
        .then(feedback => res.json(feedback)) // Respond with all feedback
        .catch(err => res.status(500).json({ error: err.message })); // Handle errors
});

module.exports = router; // Export the router
