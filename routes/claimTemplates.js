/**
 * @fileoverview This file defines the routes for handling claim templates in the Budget Claims System.
 * It includes routes for creating, reading, updating, and deleting claim templates,
 * as well as routes for template approval and sharing.
 * 
 * @requires express
 * @requires ../models/ClaimTemplate
 * @requires ../models/Claim
 * @requires ../middleware/auth
 * @requires ../middleware/activityLogger
 * @requires ../logger
 */

const express = require('express');
const ClaimTemplate = require('../models/ClaimTemplate');
const Claim = require('../models/Claim');
const { ensureAuthenticated, ensureRoles, ensureRole } = require('../middleware/auth');
const logActivity = require('../middleware/activityLogger');
const logRequest = require('../middleware/auditLogger');
const logger = require('../logger');

const router = express.Router();

/**
 * @route GET /claim-templates
 * @description Get all claim templates for the employee
 * @access Private (Employee only)
 */
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), async (req, res) => {
    try {
        // Get templates created by the user or shared with all employees
        const templates = await ClaimTemplate.find({
            $or: [
                { createdBy: req.user.id },
                { isShared: true }
            ],
            isActive: true
        }).populate('createdBy', 'name email');

        // Group templates by category
        const categorizedTemplates = {};
        templates.forEach(template => {
            const category = template.category || 'Uncategorized';
            if (!categorizedTemplates[category]) {
                categorizedTemplates[category] = [];
            }
            categorizedTemplates[category].push(template);
        });

        res.render('employee/claim_templates', {
            templates,
            categorizedTemplates,
            user: req.user
        });
    } catch (error) {
        logger.error(`Error fetching claim templates: ${error.message}`);
        req.flash('error', 'Failed to load claim templates');
        res.redirect('/dashboard');
    }
});

/**
 * @route GET /claim-templates/new
 * @description Show form to create a new claim template
 * @access Private (Employee only)
 */
router.get('/new', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), async (req, res) => {
    try {
        res.render('employee/claim_template_form', {
            template: null,
            action: 'create',
            user: req.user
        });
    } catch (error) {
        logger.error(`Error loading claim template form: ${error.message}`);
        req.flash('error', 'Failed to load template form');
        res.redirect('/claim-templates');
    }
});

/**
 * @route POST /claim-templates
 * @description Create a new claim template
 * @access Private (Employee only)
 */
router.post('/', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), logRequest, async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            isShared,
            defaultValues,
            requiredFields,
            requiresApproval
        } = req.body;

        // Create new template
        const template = new ClaimTemplate({
            name,
            description,
            category,
            isShared: isShared === 'on',
            createdBy: req.user.id,
            defaultValues: JSON.parse(defaultValues || '{}'),
            requiredFields: requiredFields ? (Array.isArray(requiredFields) ? requiredFields : [requiredFields]) : [],
            requiresApproval: requiresApproval === 'on',
            approvalStatus: requiresApproval === 'on' ? 'pending' : 'approved'
        });

        await template.save();

        // Log activity
        logActivity(req.user.id, 'Created claim template', `Created template: ${name}`);

        req.flash('success', 'Claim template created successfully');
        res.redirect('/claim-templates');
    } catch (error) {
        logger.error(`Error creating claim template: ${error.message}`);
        req.flash('error', 'Failed to create claim template');
        res.redirect('/claim-templates/new');
    }
});

/**
 * @route GET /claim-templates/:id
 * @description Get a specific claim template
 * @access Private (Employee only)
 */
router.get('/:id', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), async (req, res) => {
    try {
        const template = await ClaimTemplate.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name email');

        if (!template) {
            req.flash('error', 'Template not found');
            return res.redirect('/claim-templates');
        }

        // Check if user has access to this template
        if (!template.isShared && template.createdBy._id.toString() !== req.user.id) {
            req.flash('error', 'You do not have permission to view this template');
            return res.redirect('/claim-templates');
        }

        res.render('employee/claim_template_view', {
            template,
            user: req.user
        });
    } catch (error) {
        logger.error(`Error fetching claim template: ${error.message}`);
        req.flash('error', 'Failed to load claim template');
        res.redirect('/claim-templates');
    }
});

/**
 * @route GET /claim-templates/:id/edit
 * @description Show form to edit a claim template
 * @access Private (Employee only)
 */
router.get('/:id/edit', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), async (req, res) => {
    try {
        const template = await ClaimTemplate.findById(req.params.id);

        if (!template) {
            req.flash('error', 'Template not found');
            return res.redirect('/claim-templates');
        }

        // Check if user has permission to edit
        if (template.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            req.flash('error', 'You do not have permission to edit this template');
            return res.redirect('/claim-templates');
        }

        res.render('employee/claim_template_form', {
            template,
            action: 'edit',
            user: req.user
        });
    } catch (error) {
        logger.error(`Error loading template edit form: ${error.message}`);
        req.flash('error', 'Failed to load template edit form');
        res.redirect('/claim-templates');
    }
});

/**
 * @route PUT /claim-templates/:id
 * @description Update a claim template
 * @access Private (Employee only)
 */
router.put('/:id', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), logRequest, async (req, res) => {
    try {
        const template = await ClaimTemplate.findById(req.params.id);

        if (!template) {
            req.flash('error', 'Template not found');
            return res.redirect('/claim-templates');
        }

        // Check if user has permission to edit
        if (template.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            req.flash('error', 'You do not have permission to edit this template');
            return res.redirect('/claim-templates');
        }

        const {
            name,
            description,
            category,
            isShared,
            defaultValues,
            requiredFields,
            requiresApproval
        } = req.body;

        // Update template
        template.name = name;
        template.description = description;
        template.category = category;
        template.isShared = isShared === 'on';
        template.defaultValues = JSON.parse(defaultValues || '{}');
        template.requiredFields = requiredFields ? (Array.isArray(requiredFields) ? requiredFields : [requiredFields]) : [];
        
        // If approval requirements changed, update approval status
        if (requiresApproval === 'on' && !template.requiresApproval) {
            template.requiresApproval = true;
            template.approvalStatus = 'pending';
            template.approvedBy = null;
            template.approvedAt = null;
        } else if (requiresApproval !== 'on') {
            template.requiresApproval = false;
            template.approvalStatus = 'approved';
        }

        // Increment version
        template.version += 1;

        await template.save();

        // Log activity
        logActivity(req.user.id, 'Updated claim template', `Updated template: ${name}`);

        req.flash('success', 'Claim template updated successfully');
        res.redirect('/claim-templates');
    } catch (error) {
        logger.error(`Error updating claim template: ${error.message}`);
        req.flash('error', 'Failed to update claim template');
        res.redirect(`/claim-templates/${req.params.id}/edit`);
    }
});

/**
 * @route DELETE /claim-templates/:id
 * @description Delete a claim template
 * @access Private (Employee only)
 */
router.delete('/:id', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), logRequest, async (req, res) => {
    try {
        const template = await ClaimTemplate.findById(req.params.id);

        if (!template) {
            req.flash('error', 'Template not found');
            return res.redirect('/claim-templates');
        }

        // Check if user has permission to delete
        if (template.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            req.flash('error', 'You do not have permission to delete this template');
            return res.redirect('/claim-templates');
        }

        // Soft delete by marking as inactive
        template.isActive = false;
        await template.save();

        // Log activity
        logActivity(req.user.id, 'Deleted claim template', `Deleted template: ${template.name}`);

        req.flash('success', 'Claim template deleted successfully');
        res.redirect('/claim-templates');
    } catch (error) {
        logger.error(`Error deleting claim template: ${error.message}`);
        req.flash('error', 'Failed to delete claim template');
        res.redirect('/claim-templates');
    }
});

/**
 * @route POST /claim-templates/:id/approve
 * @description Approve a claim template
 * @access Private (Admin and Manager only)
 */
router.post('/:id/approve', ensureAuthenticated, ensureRoles(['admin', 'manager']), logRequest, async (req, res) => {
    try {
        const template = await ClaimTemplate.findById(req.params.id);

        if (!template) {
            req.flash('error', 'Template not found');
            return res.redirect('/claim-templates');
        }

        // Update approval status
        template.approvalStatus = 'approved';
        template.approvedBy = req.user.id;
        template.approvedAt = new Date();

        await template.save();

        // Log activity
        logActivity(req.user.id, 'Approved claim template', `Approved template: ${template.name}`);

        req.flash('success', 'Claim template approved successfully');
        res.redirect('/claim-templates');
    } catch (error) {
        logger.error(`Error approving claim template: ${error.message}`);
        req.flash('error', 'Failed to approve claim template');
        res.redirect('/claim-templates');
    }
});

/**
 * @route POST /claim-templates/:id/reject
 * @description Reject a claim template
 * @access Private (Admin and Manager only)
 */
router.post('/:id/reject', ensureAuthenticated, ensureRoles(['admin', 'manager']), logRequest, async (req, res) => {
    try {
        const template = await ClaimTemplate.findById(req.params.id);

        if (!template) {
            req.flash('error', 'Template not found');
            return res.redirect('/claim-templates');
        }

        // Update approval status
        template.approvalStatus = 'rejected';
        template.approvedBy = req.user.id;
        template.approvedAt = new Date();

        await template.save();

        // Log activity
        logActivity(req.user.id, 'Rejected claim template', `Rejected template: ${template.name}`);

        req.flash('success', 'Claim template rejected successfully');
        res.redirect('/claim-templates');
    } catch (error) {
        logger.error(`Error rejecting claim template: ${error.message}`);
        req.flash('error', 'Failed to reject claim template');
        res.redirect('/claim-templates');
    }
});

/**
 * @route POST /claim-templates/:id/use
 * @description Use a template to create a new claim
 * @access Private (Employee only)
 */
router.post('/:id/use', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), async (req, res) => {
    try {
        const template = await ClaimTemplate.findById(req.params.id);

        if (!template) {
            req.flash('error', 'Template not found');
            return res.redirect('/claim-templates');
        }

        // Check if template is approved if it requires approval
        if (template.requiresApproval && template.approvalStatus !== 'approved') {
            req.flash('error', 'This template requires approval before use');
            return res.redirect('/claim-templates');
        }

        // Redirect to add claim page with template ID
        res.redirect(`/claims/add?templateId=${template._id}`);
    } catch (error) {
        logger.error(`Error using claim template: ${error.message}`);
        req.flash('error', 'Failed to use claim template');
        res.redirect('/claim-templates');
    }
});

module.exports = router; 