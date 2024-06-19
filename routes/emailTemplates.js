const express = require('express');
const EmailTemplate = require('../models/EmailTemplate');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const router = express.Router();

// Route to list all email templates
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    console.log('Email Templates route accessed');
    try {
        const emailTemplates = await EmailTemplate.find();
        res.render('email_templates_list', { title: 'Email Templates', emailTemplates });
    } catch (err) {
        console.error('Error fetching email templates:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Route to display the add email template form
router.get('/add', ensureAuthenticated, ensureRoles(['admin', 'manager']), (req, res) => {
    res.render('add_email_template', { title: 'Add Email Template' });
});

// Route to handle adding a new email template
router.post('/add', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const { name, subject, body } = req.body;
    try {
        const newTemplate = new EmailTemplate({ name, subject, body });
        await newTemplate.save();
        res.redirect('/email-templates');
    } catch (err) {
        console.error('Error adding email template:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Route to display the edit email template form
router.get('/:id/edit', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        const emailTemplate = await EmailTemplate.findById(req.params.id);
        if (!emailTemplate) {
            return res.status(404).render('404', { message: 'Email Template not found' });
        }
        res.render('edit_email_template', { title: 'Edit Email Template', emailTemplate });
    } catch (err) {
        console.error('Error fetching email template:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Route to handle updating an email template
router.post('/:id/edit', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const { name, subject, body } = req.body;
    try {
        const emailTemplate = await EmailTemplate.findById(req.params.id);
        if (!emailTemplate) {
            return res.status(404).render('404', { message: 'Email Template not found' });
        }
        emailTemplate.name = name;
        emailTemplate.subject = subject;
        emailTemplate.body = body;
        emailTemplate.updatedAt = Date.now();
        await emailTemplate.save();
        res.redirect('/email-templates');
    } catch (err) {
        console.error('Error updating email template:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
