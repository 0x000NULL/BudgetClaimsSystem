const express = require('express'); // Import Express to create a router
const EmailTemplate = require('../models/EmailTemplate'); // Import the EmailTemplate model to interact with the emailTemplates collection in MongoDB
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware

const router = express.Router(); // Create a new router

// Route to list all email templates
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    console.log('Fetching email templates'); // Debug log
    try {
        const emailTemplates = await EmailTemplate.find(); // Fetch all email templates from the database
        console.log('Email templates found:', emailTemplates); // Debug log
        res.render('email_templates', { title: 'Email Templates', emailTemplates }); // Render the email templates view
    } catch (err) {
        console.error('Error fetching email templates:', err.message); // Log error if fetching fails
        res.status(500).render('500', { message: 'Internal Server Error' }); // Render 500 error page
    }
});

// Route to display the add email template form
router.get('/add', ensureAuthenticated, ensureRoles(['admin']), (req, res) => {
    console.log('Add email template route accessed'); // Debug log
    res.render('add_email_template', { title: 'Add Email Template' }); // Render the add email template form
});

// Route to handle the creation of a new email template
router.post('/add', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const { name, subject, body } = req.body; // Extract template details from the request body
    console.log('Creating new email template with data:', req.body); // Debug log

    try {
        const newTemplate = new EmailTemplate({ name, subject, body }); // Create a new EmailTemplate instance
        await newTemplate.save(); // Save the new template to the database
        console.log('New email template created:', newTemplate); // Debug log
        res.redirect('/email-templates'); // Redirect to the email templates list
    } catch (err) {
        console.error('Error creating email template:', err.message); // Log error if creation fails
        res.status(500).render('500', { message: 'Internal Server Error' }); // Render 500 error page
    }
});

// Route to display the edit email template form
router.get('/:id/edit', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const templateId = req.params.id; // Extract template ID from the request parameters
    console.log(`Fetching email template for editing with ID: ${templateId}`); // Debug log
    try {
        const emailTemplate = await EmailTemplate.findById(templateId); // Find the email template by ID
        if (!emailTemplate) {
            console.error(`Email template with ID ${templateId} not found`); // Log error if template not found
            return res.status(404).render('404', { message: 'Email template not found' }); // Render 404 error page
        }
        console.log(`Email template fetched for editing: ${emailTemplate}`); // Debug log
        res.render('edit_email_template', { title: 'Edit Email Template', emailTemplate }); // Render the edit email template form
    } catch (err) {
        console.error(`Error fetching email template for editing: ${err.message}`); // Log error if fetching fails
        res.status(500).render('500', { message: 'Internal Server Error' }); // Render 500 error page
    }
});

// Route to handle the updating of an email template
router.post('/:id/edit', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const templateId = req.params.id; // Extract template ID from the request parameters
    const { name, subject, body } = req.body; // Extract updated template details from the request body
    console.log(`Updating email template with ID: ${templateId}`); // Debug log

    try {
        const emailTemplate = await EmailTemplate.findById(templateId); // Find the email template by ID
        if (!emailTemplate) {
            console.error(`Email template with ID ${templateId} not found`); // Log error if template not found
            return res.status(404).render('404', { message: 'Email template not found' }); // Render 404 error page
        }

        // Update the template details
        emailTemplate.name = name;
        emailTemplate.subject = subject;
        emailTemplate.body = body;

        await emailTemplate.save(); // Save the updated template to the database
        console.log('Email template updated:', emailTemplate); // Debug log
        res.redirect('/email-templates'); // Redirect to the email templates list
    } catch (err) {
        console.error(`Error updating email template: ${err.message}`); // Log error if updating fails
        res.status(500).render('500', { message: 'Internal Server Error' }); // Render 500 error page
    }
});

// Route to handle the deletion of an email template
router.post('/:id/delete', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const templateId = req.params.id; // Extract template ID from the request parameters
    console.log(`Deleting email template with ID: ${templateId}`); // Debug log

    try {
        await EmailTemplate.findByIdAndDelete(templateId); // Find and delete the email template by ID
        console.log(`Email template with ID ${templateId} deleted`); // Debug log
        res.redirect('/email-templates'); // Redirect to the email templates list
    } catch (err) {
        console.error(`Error deleting email template: ${err.message}`); // Log error if deletion fails
        res.status(500).render('500', { message: 'Internal Server Error' }); // Render 500 error page
    }
});

module.exports = router; // Export the router
