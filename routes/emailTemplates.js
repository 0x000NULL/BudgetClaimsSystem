const express = require('express'); // Import Express to create a router
const EmailTemplate = require('../models/EmailTemplate'); // Import the EmailTemplate model to interact with the emailTemplates collection in MongoDB
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware

const router = express.Router(); // Create a new router

// Route to list all email templates
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    console.log('Fetching email templates'); // Debug log
    try {
        const emailTemplates = await EmailTemplate.find();
        console.log('Email templates found:', emailTemplates); // Debug log
        res.render('email_templates', { title: 'Email Templates', emailTemplates });
    } catch (err) {
        console.error('Error fetching email templates:', err.message);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

// Route to display the add email template form
router.get('/add', ensureAuthenticated, ensureRoles(['admin']), (req, res) => {
    console.log('Add email template route accessed');
    res.render('add_email_template', { title: 'Add Email Template' });
});

// Route to handle the creation of a new email template
router.post('/add', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const { name, subject, body } = req.body;
    console.log('Creating new email template with data:', req.body);

    try {
        const newTemplate = new EmailTemplate({ name, subject, body });
        await newTemplate.save();
        console.log('New email template created:', newTemplate);
        res.redirect('/email-templates');
    } catch (err) {
        console.error('Error creating email template:', err.message);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

// Route to display the edit email template form
router.get('/:id/edit', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const templateId = req.params.id;
    console.log(`Fetching email template for editing with ID: ${templateId}`); // Debug log
    try {
        const emailTemplate = await EmailTemplate.findById(templateId);
        if (!emailTemplate) {
            console.error(`Email template with ID ${templateId} not found`);
            return res.status(404).render('404', { message: 'Email template not found' });
        }
        console.log(`Email template fetched for editing: ${emailTemplate}`); // Debug log
        res.render('edit_email_template', { title: 'Edit Email Template', emailTemplate });
    } catch (err) {
        console.error(`Error fetching email template for editing: ${err.message}`);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

// Route to handle the updating of an email template
router.post('/:id/edit', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const templateId = req.params.id;
    const { name, subject, body } = req.body;
    console.log(`Updating email template with ID: ${templateId}`);

    try {
        const emailTemplate = await EmailTemplate.findById(templateId);
        if (!emailTemplate) {
            console.error(`Email template with ID ${templateId} not found`);
            return res.status(404).render('404', { message: 'Email template not found' });
        }

        emailTemplate.name = name;
        emailTemplate.subject = subject;
        emailTemplate.body = body;

        await emailTemplate.save();
        console.log('Email template updated:', emailTemplate);
        res.redirect('/email-templates');
    } catch (err) {
        console.error(`Error updating email template: ${err.message}`);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

// Route to handle the deletion of an email template
router.post('/:id/delete', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    const templateId = req.params.id;
    console.log(`Deleting email template with ID: ${templateId}`); // Debug log

    try {
        await EmailTemplate.findByIdAndDelete(templateId);
        console.log(`Email template with ID ${templateId} deleted`); // Debug log
        res.redirect('/email-templates');
    } catch (err) {
        console.error(`Error deleting email template: ${err.message}`);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

module.exports = router; // Export the router
