const express = require('express'); // Import Express to create a router
const EmailTemplate = require('../models/EmailTemplate'); // Import the EmailTemplate model to interact with the emailTemplates collection in MongoDB
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware
const pinoLogger = require('../logger'); // Import Pino logger

const router = express.Router(); // Create a new router

// Define sensitive fields that should not be logged
const sensitiveFields = ['password', 'token', 'ssn'];

// Function to filter out sensitive fields from the request body
const filterSensitiveData = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }
    
    return Object.keys(data).reduce((filteredData, key) => {
        if (sensitiveFields.includes(key)) {
            filteredData[key] = '***REDACTED***'; // Mask the sensitive field
        } else if (typeof data[key] === 'object') {
            filteredData[key] = filterSensitiveData(data[key]); // Recursively filter nested objects
        } else {
            filteredData[key] = data[key];
        }
        return filteredData;
    }, {});
};

// Helper function to log requests with user and session info
const logRequest = (req, message, extra = {}) => {
    const { method, originalUrl, headers, body } = req;
    const filteredBody = filterSensitiveData(body); // Filter sensitive data from the request body

    pinoLogger.info({
        message, // Log message
        user: req.user ? req.user.email : 'Unauthenticated', // Log user
        ip: req.ip, // Log IP address
        sessionId: req.sessionID, // Log session ID
        timestamp: new Date().toISOString(), // Add a timestamp
        method, // Log HTTP method
        url: originalUrl, // Log originating URL
        requestBody: filteredBody, // Log the filtered request body
        headers // Log request headers
    });
};

// Route to list all email templates
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    logRequest(req, 'Fetching email templates');
    try {
        const emailTemplates = await EmailTemplate.find(); // Fetch all email templates from the database
        logRequest(req, 'Email templates found', { emailTemplates });
        res.render('email_templates', { title: 'Email Templates', emailTemplates }); // Render the email templates view
    } catch (err) {
        logRequest(req, 'Error fetching email templates', { error: err });
        res.status(500).render('500', { message: 'Internal Server Error' }); // Render 500 error page
    }
});

// Route to display the add email template form
router.get('/add', ensureAuthenticated, ensureRoles(['admin']), (req, res) => {
    logRequest(req, 'Add email template route accessed');
    res.render('add_email_template', { title: 'Add Email Template' }); // Render the add email template form
});

// Route to handle the creation of a new email template
router.post('/add', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const { name, subject, body } = req.body; // Extract template details from the request body
    logRequest(req, 'Creating new email template', { name, subject, body });

    try {
        const newTemplate = new EmailTemplate({ name, subject, body }); // Create a new EmailTemplate instance
        await newTemplate.save(); // Save the new template to the database
        logRequest(req, 'New email template created', { newTemplate });
        res.redirect('/email-templates'); // Redirect to the email templates list
    } catch (err) {
        logRequest(req, 'Error creating email template', { error: err });
        res.status(500).render('500', { message: 'Internal Server Error' }); // Render 500 error page
    }
});

// Route to display the edit email template form
router.get('/:id/edit', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const templateId = req.params.id; // Extract template ID from the request parameters
    logRequest(req, `Fetching email template for editing with ID: ${templateId}`);
    try {
        const emailTemplate = await EmailTemplate.findById(templateId); // Find the email template by ID
        if (!emailTemplate) {
            logRequest(req, `Email template with ID ${templateId} not found`, { level: 'error' });
            return res.status(404).render('404', { message: 'Email template not found' }); // Render 404 error page
        }
        logRequest(req, `Email template fetched for editing`, { emailTemplate });
        res.render('edit_email_template', { title: 'Edit Email Template', emailTemplate }); // Render the edit email template form
    } catch (err) {
        logRequest(req, 'Error fetching email template for editing', { error: err });
        res.status(500).render('500', { message: 'Internal Server Error' }); // Render 500 error page
    }
});

// Route to handle the updating of an email template
router.post('/:id/edit', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const templateId = req.params.id; // Extract template ID from the request parameters
    const { name, subject, body } = req.body; // Extract updated template details from the request body
    logRequest(req, `Updating email template with ID: ${templateId}`, { name, subject, body });

    try {
        const emailTemplate = await EmailTemplate.findById(templateId); // Find the email template by ID
        if (!emailTemplate) {
            logRequest(req, `Email template with ID ${templateId} not found`, { level: 'error' });
            return res.status(404).render('404', { message: 'Email template not found' }); // Render 404 error page
        }

        // Update the template details
        emailTemplate.name = name;
        emailTemplate.subject = subject;
        emailTemplate.body = body;

        await emailTemplate.save(); // Save the updated template to the database
        logRequest(req, 'Email template updated', { emailTemplate });
        res.redirect('/email-templates'); // Redirect to the email templates list
    } catch (err) {
        logRequest(req, 'Error updating email template', { error: err });
        res.status(500).render('500', { message: 'Internal Server Error' }); // Render 500 error page
    }
});

// Route to handle the deletion of an email template
router.post('/:id/delete', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const templateId = req.params.id; // Extract template ID from the request parameters
    logRequest(req, `Deleting email template with ID: ${templateId}`);

    try {
        await EmailTemplate.findByIdAndDelete(templateId); // Find and delete the email template by ID
        logRequest(req, `Email template with ID ${templateId} deleted`);
        res.redirect('/email-templates'); // Redirect to the email templates list
    } catch (err) {
        logRequest(req, 'Error deleting email template', { error: err });
        res.status(500).render('500', { message: 'Internal Server Error' }); // Render 500 error page
    }
});

module.exports = router; // Export the router
