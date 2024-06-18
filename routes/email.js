// Import required modules
const express = require('express');
const nodemailer = require('nodemailer');

// Create a new router
const router = express.Router();

// Route to send an email
router.post('/', (req, res) => {
    const { email, subject, text } = req.body;

    // Configure the email transporter
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'your_email@gmail.com',
            pass: 'your_email_password'
        }
    });

    // Define the email options
    const mailOptions = {
        from: 'your_email@gmail.com',
        to: email,
        subject: subject,
        text: text
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        } else {
            res.json({ msg: 'Email sent: ' + info.response });
        }
    });
});

// Export the router
module.exports = router;
