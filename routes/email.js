const express = require('express');
const EmailTemplate = require('../models/EmailTemplate');
const Claim = require('../models/Claim');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const router = express.Router();

// Route to render the email form
router.get('/form/:claimId', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.claimId);
        if (!claim) {
            return res.status(404).render('404', { message: 'Claim not found' });
        }
        const emailTemplates = await EmailTemplate.find();
        res.render('email_form', { claim, emailTemplates });
    } catch (err) {
        console.error('Error rendering email form:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Route to fetch a single email template by ID
router.get('/templates/:id', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        const template = await EmailTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        res.json(template);
    } catch (err) {
        console.error('Error fetching email template:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Route to send an email
router.post('/send', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const { claimId, subject, body } = req.body;
    console.log('Sending email with the following details:', { claimId, subject, body }); // Debugging log
    try {
        const claim = await Claim.findById(claimId);
        if (!claim) {
            return res.status(404).render('404', { message: 'Claim not found' });
        }

        // Create a transporter object using the Office365 SMTP transport
        const transporter = nodemailer.createTransport({
            host: 'smtp.office365.com', // SMTP server address for Office365
            port: 587, // Port number for TLS/STARTTLS
            secure: false, // Set to true if using port 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER, // Email user from environment variables
                pass: process.env.EMAIL_PASS  // Email password from environment variables
            },
            tls: {
                ciphers: 'SSLv3' // Use SSLv3 for TLS
            },
            debug: true, // Enable debug output
            logger: true // Enable logger
        });

        // Send email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: claim.customerEmail, // The customer's email
            subject: subject,
            text: body
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ error: error.message });
            }
            console.log('Email sent:', info.response); // Log the response from the email service
            res.status(200).json({ message: 'Email sent successfully' });
        });
    } catch (err) {
        console.error('Error sending email:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
