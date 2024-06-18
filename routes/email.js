const express = require('express'); // Import Express to create a router
const transporter = require('../config/nodemailer'); // Import the Nodemailer configuration
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication middleware
const router = express.Router(); // Create a new router

// Route to send an email, accessible only by admin and manager
router.post('/send', ensureAuthenticated, ensureRoles(['admin', 'manager']), (req, res) => {
    const { to, subject, text } = req.body; // Extract email details from the request body

    // Setup email options
    const mailOptions = {
        from: process.env.EMAIL_USER, // Sender address from environment variables
        to, // Recipient address from the request body
        subject, // Subject of the email from the request body
        text // Plain text body of the email from the request body
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ error: error.message }); // Handle errors
        } else {
            return res.json({ msg: 'Email sent', info }); // Respond with success message
        }
    });
});

module.exports = router; // Export the router
