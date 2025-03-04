/**
 * @fileoverview This file defines the routes for handling claims in the Budget Claims System.
 * It includes routes for exporting claims as PDF, adding new claims, searching for claims,
 * fetching all claims, and updating existing claims. The routes are protected by authentication
 * and role-based access control middleware.
 */

const express = require('express');
const Claim = require('../models/Claim');
const path = require('path');
const { ensureAuthenticated, ensureRoles, ensureRole } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');
const { notifyNewClaim, notifyClaimStatusUpdate, notifyClaimAssigned, notifyClaimUpdated } = require('../notifications/notify');
const csv = require('csv-express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const cacheManager = require('cache-manager');
const redisStore = require('cache-manager-redis-store');
const pinoLogger = require('../logger');
const Status = require('../models/Status');
const Location = require('../models/Location');
const DamageType = require('../models/DamageType');
const fileUpload = require('express-fileupload');
const Settings = require('../models/Settings');
const uploadsPath = require('../config/settings');
const logger = require('../logger');

const router = express.Router();

// Middleware for file uploads
router.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    useTempFiles: true,
    tempFileDir: '/tmp/',
    debug: process.env.NODE_ENV === 'development'
}));

// GET /claims - Display list of claims
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const claims = await Claim.find()
            .populate('status')
            .populate('rentingLocation')
            .populate('damageType')
            .sort('-createdAt')
            .exec();

        res.render('claims/index', { claims });
    } catch (err) {
        logger.error('Error fetching claims:', err);
        res.status(500).render('error', { error: err });
    }
});

// GET /claims/new - Display new claim form
router.get('/new', ensureAuthenticated, async (req, res) => {
    try {
        const [statuses, locations, damageTypes] = await Promise.all([
            Status.find(),
            Location.find(),
            DamageType.find()
        ]);

        res.render('claims/new', { statuses, locations, damageTypes });
    } catch (err) {
        logger.error('Error loading new claim form:', err);
        res.status(500).render('error', { error: err });
    }
});

// POST /claims - Create new claim
router.post('/', ensureAuthenticated, logActivity('create_claim'), async (req, res) => {
    try {
        const claim = await Claim.create(req.body);
        await notifyNewClaim(claim);
        req.flash('success', 'Claim created successfully');
        res.redirect('/claims');
    } catch (err) {
        logger.error('Error creating claim:', err);
        req.flash('error', 'Error creating claim');
        res.status(500).render('claims/new', { error: err });
    }
});

// GET /claims/:id - Display claim details
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.id)
            .populate('status')
            .populate('rentingLocation')
            .populate('damageType')
            .exec();

        if (!claim) {
            return res.status(404).render('404', { message: 'Claim not found' });
        }

        res.render('claims/view', { claim });
    } catch (err) {
        logger.error('Error fetching claim:', err);
        res.status(500).render('error', { error: err });
    }
});

// GET /claims/:id/edit - Display edit form
router.get('/:id/edit', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('view_claim_edit'), async (req, res) => {
    try {
        const [claim, statuses, locations, damageTypes] = await Promise.all([
            Claim.findById(req.params.id)
                .populate('status')
                .populate('rentingLocation')
                .populate('damageType')
                .exec(),
            Status.find().sort({ name: 1 }),
            Location.find().sort({ name: 1 }),
            DamageType.find().sort({ name: 1 })
        ]);

        if (!claim) {
            return res.status(404).render('404', { message: 'Claim not found' });
        }

        res.render('claims/edit', {
            claim,
            statuses,
            locations,
            damageTypes,
            rentingLocations: locations,
            errors: {}
        });
    } catch (err) {
        logger.error('Error loading edit form:', err);
        res.status(500).render('error', { error: err });
    }
});

// PUT /claims/:id - Update claim
router.put('/:id', ensureAuthenticated, logActivity('update_claim'), async (req, res) => {
    try {
        const claim = await Claim.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!claim) {
            return res.status(404).render('404', { message: 'Claim not found' });
        }

        await notifyClaimUpdated(claim);
        req.flash('success', 'Claim updated successfully');
        res.redirect('/claims');
    } catch (err) {
        logger.error('Error updating claim:', err);
        req.flash('error', 'Error updating claim');
        res.status(500).render('error', { error: err });
    }
});

// DELETE /claims/:id - Delete claim
router.delete('/:id', ensureAuthenticated, ensureRole('admin'), logActivity('delete_claim'), async (req, res) => {
    try {
        const claim = await Claim.findByIdAndDelete(req.params.id);
        
        if (!claim) {
            return res.status(404).render('404', { message: 'Claim not found' });
        }

        req.flash('success', 'Claim deleted successfully');
        res.redirect('/claims');
    } catch (err) {
        logger.error('Error deleting claim:', err);
        req.flash('error', 'Error deleting claim');
        res.status(500).render('error', { error: err });
    }
});

// POST /claims/:id/assign - Assign claim to user
router.post('/:id/assign', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('assign_claim'), async (req, res) => {
    try {
        const claim = await Claim.findByIdAndUpdate(
            req.params.id,
            { $set: { assignedTo: req.body.userId } },
            { new: true }
        );

        if (!claim) {
            return res.status(404).render('404', { message: 'Claim not found' });
        }

        await notifyClaimAssigned(claim, req.body.userId);
        req.flash('success', 'Claim assigned successfully');
        res.redirect('/claims');
    } catch (err) {
        logger.error('Error assigning claim:', err);
        req.flash('error', 'Error assigning claim');
        res.status(500).render('error', { error: err });
    }
});

// POST /claims/:id/status - Update claim status
router.post('/:id/status', ensureAuthenticated, logActivity('update_claim_status'), async (req, res) => {
    try {
        const claim = await Claim.findByIdAndUpdate(
            req.params.id,
            { $set: { status: req.body.statusId } },
            { new: true }
        );

        if (!claim) {
            return res.status(404).render('404', { message: 'Claim not found' });
        }

        await notifyClaimStatusUpdate(claim);
        req.flash('success', 'Claim status updated successfully');
        res.redirect('/claims');
    } catch (err) {
        logger.error('Error updating claim status:', err);
        req.flash('error', 'Error updating claim status');
        res.status(500).render('error', { error: err });
    }
});

module.exports = router;

// Route to get a specific claim by ID for editing, accessible by admin and manager
router.get('/:id/edit', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Viewed claim edit form'), async (req, res) => {
    const claimId = req.params.id;
    logRequest(req, `Fetching claim for editing with ID: ${claimId}`);

    try {
        const claim = await Claim.findById(claimId);
        if (!claim) {
            return res.status(404).render('404', { message: 'Claim not found' });
        }

        const statuses = await Status.find().sort({ name: 1 });
        const locations = await Location.find().sort({ name: 1 });
        const damageTypes = await DamageType.find().sort({ name: 1 });

        res.render('claims_edit', {
            claim,
            statuses,
            locations,
            damageTypes,
            rentingLocations: locations,
            errors: {}
        });
    } catch (err) {
        logRequest(req, 'Error fetching claim for editing:', { error: err });
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

        
// PUT /claims/:id - Update a claim
router.put('/:id', ensureAuthenticated, logActivity('update claim'), async (req, res) => {
    try {
        const claimId = req.params.id;
        console.log('Incoming request body:', req.body);

        const claim = await Claim.findById(claimId);
        
        if (!claim) {
            logger.error('Claim not found:', claimId);
            return res.render('500', { message: 'Claim not found' });
        }

        const updateData = { 
            ...req.body,
            updatedAt: new Date() // Explicitly set updatedAt to current time
        };
        let notes = [];

        // Process existing notes
        if (claim.notes && claim.notes.length > 0) {
            const deletedNotes = updateData.deletedNotes ? JSON.parse(updateData.deletedNotes) : [];
            notes = claim.notes.filter(note => !deletedNotes.includes(note._id.toString()));
        }

        // Process new note
        if (updateData.newNote) {
            try {
                let newNote;
                if (typeof updateData.newNote === 'string') {
                    newNote = JSON.parse(updateData.newNote);
                } else {
                    newNote = updateData.newNote;
                }

                if (newNote && newNote.content) {
                    notes.push({
                        content: newNote.content,
                        type: newNote.type || 'user',
                        source: newNote.source || null,
                        createdAt: new Date(), // Use current time for new note
                        createdBy: req.user ? req.user._id : null
                    });
                }
            } catch (e) {
                console.error('Error parsing new note:', e);
            }
        }

        // Update the notes in the updateData
        updateData.notes = notes;

        // Remove the note fields from updateData
        delete updateData.newNote;
        delete updateData.newNotes;
        delete updateData['newNotes[]'];
        delete updateData.deletedNotes;

        // Update the claim with timestamps option
        const updatedClaim = await Claim.findByIdAndUpdate(
            claimId,
            updateData,
            { 
                new: true,
                timestamps: true // Ensure timestamps are updated
            }
        );

        // Log the update
        logger.info('Claim updated:', {
            claimId: updatedClaim._id,
            updatedAt: updatedClaim.updatedAt,
            status: updatedClaim.status
        });

        await notifyClaimStatusUpdate(req.user.email, updatedClaim);
        
        // Redirect back to the claim view
        res.redirect(`/claims/${updatedClaim._id}`);

    } catch (error) {
        logger.error('Error updating claim:', error);
        res.render('500', { 
            message: 'Error updating claim: ' + (error.message || 'Unknown error') 
        });
    }
});


// DELETE /claims/:id - Delete a claim
router.delete('/:id', ensureAuthenticated, logActivity('delete claim'), async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.id);
        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        await claim.remove();
        res.status(200).json({ msg: 'Claim deleted' });
    } catch (error) {
        logger.error('Error deleting claim:', error);
        res.render('500', { message: 'Error deleting claim' });
    }
});

// Route for bulk updating claims, accessible by admin and manager
router.put('/bulk/update', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Bulk updated claims'), async (req, res) => {
    const { claimIds, updateData } = req.body; // Extract claim IDs and update data from the request body

    logRequest(req, 'Bulk updating claims with IDs:', { claimIds, updateData });

    try {
        // Update multiple claims based on provided IDs and data
        const result = await Claim.updateMany({ _id: { $in: claimIds } }, updateData);
        logRequest(req, 'Claims updated:', { result });
        res.json({ msg: 'Claims updated', result }); // Respond with update result
        claimIds.forEach(id => cache.del(`claim_${id}`)); // Invalidate the cache for the updated claims
        //cache.del('/claims'); // Invalidate the cache for claims list
    } catch (err) {
        logRequest(req, 'Error bulk updating claims:', { error: err });
        res.render('500', { message: 'Error updating claims' });
    }
});

// Route for bulk exporting claims, accessible by admin and manager
router.post('/bulk/export', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Bulk exported claims'), async (req, res) => {
    const { claimIds, format } = req.body; // Extract claim IDs and export format from the request body

    logRequest(req, 'Bulk exporting claims with IDs:', { claimIds, format });

    try {
        // Find claims based on provided IDs
        const claims = await Claim.find({ _id: { $in: claimIds } });

        if (format === 'csv') {
            logRequest(req, 'Exporting claims to CSV');
            res.csv(claims, true); // Export claims to CSV
        } else if (format === 'excel') {
            logRequest(req, 'Exporting claims to Excel');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Claims');
            worksheet.columns = [
                { header: 'MVA', key: 'mva', width: 10 },
                { header: 'Customer Name', key: 'customerName', width: 30 },
                { header: 'Description', key: 'description', width: 50 },
                { header: 'Status', key: 'status', width: 10 },
                { header: 'Date', key: 'date', width: 15 }
            ];
            claims.forEach(claim => {
                worksheet.addRow(claim);
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=claims.xlsx');
            workbook.xlsx.write(res).then(() => res.end());
        } else if (format === 'pdf') {
            logRequest(req, 'Exporting claims to PDF');
            const doc = new PDFDocument();
            doc.pipe(res);
            doc.text('Claims Report', { align: 'center' });
            claims.forEach(claim => {
                doc.text(`MVA: ${claim.mva}`);
                doc.text(`Customer Name: ${claim.customerName}`);
                doc.text(`Description: ${claim.description}`);
                doc.text(`Status: ${claim.status}`);
                doc.text(`Date: ${new Date(claim.date).toLocaleDateString()}`);
                doc.moveDown();
            });
            doc.end();
        } else {
            logRequest(req, 'Invalid export format:', { format });
            res.status(400).json({ msg: 'Invalid format' });
        }
    } catch (err) {
        logRequest(req, 'Error exporting claims:', { error: err });
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// Route to view a specific claim by ID, with options to edit or delete, accessible by admin, manager, and employee
router.get('/:id', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), logActivity('Viewed claim details'), async (req, res) => {
    const claimId = req.params.id;
    logRequest(req, 'Fetching claim details with ID:', { claimId });

    try {
        const claim = await Claim.findById(claimId).populate('rentingLocation').exec(); // Populate rentingLocation
        if (!claim) {
            logRequest(req, `Claim with ID ${claimId} not found`, { level: 'error' });
            return res.status(404).render('404', { message: 'Claim not found' });
        }
        logRequest(req, 'Claim details fetched:', { claim });
        res.render('claim_view', { title: 'View Claim', claim });
    } catch (err) {
        logRequest(req, 'Error fetching claim details:', { error: err });
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

// Route to add a new status
router.post('/status/add', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const { name } = req.body;

    try {
        const newStatus = new Status({ name });
        await newStatus.save();
        res.status(201).json({ message: 'Status added successfully' });
    } catch (error) {
        res.render('500', { message: 'Error adding status' });
    }
});

// Route to add a new damage type
router.post('/damage-type/add', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const { name } = req.body;

    try {
        const newDamageType = new DamageType({ name });
        await newDamageType.save();
        res.status(201).json({ message: 'Damage Type added successfully' });
    } catch (error) {
        res.render('500', { message: 'Error adding damage type' });
    }
});

// Route to add a new location
router.post('/location/add', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const { name } = req.body;

    try {
        const newLocation = new Location({ name });
        await newLocation.save();
        res.status(201).json({ message: 'Location added successfully' });
    } catch (error) {
        res.render('500', { message: 'Error adding location' });
    }
})

// Fetch all statuses
router.get('/statuses', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    logRequest(req, 'Statuses route accessed'); // Log route access
    try {
        const statuses = await Status.find(); // Fetch all statuses from the database
        logRequest(req, 'Statuses fetched', { statuses }); // Log fetched statuses
        res.json(statuses); // Return statuses as JSON
    } catch (err) {
        logRequest(req, 'Error fetching statuses', { error: err.message }); // Log error
        res.render('500', { message: 'Error fetching statuses' });
    }
});

// Route to remove a status
router.delete('/status/remove/:id', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const statusId = req.params.id;

    try {
        await Status.findByIdAndDelete(statusId);
        res.status(200).json({ message: 'Status removed successfully' });
    } catch (error) {
        res.render('500', { message: 'Error removing status' });
    }
});

// Route to remove a damage type
router.delete('/damage-type/remove/:id', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const damageTypeId = req.params.id;

    try {
        await DamageType.findByIdAndDelete(damageTypeId);
        res.status(200).json({ message: 'Damage Type removed successfully' });
    } catch (error) {
        res.render('500', { message: 'Error removing damage type' });
    }
});

// Fetch all damage types
router.get('/damage-types', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    logRequest(req, 'Damage Types route accessed'); // Log route access
    try {
        const damageTypes = await DamageType.find(); // Fetch all damage types from the database
        logRequest(req, 'Damage Types fetched', { damageTypes }); // Log fetched damage types
        res.json(damageTypes); // Return damage types as JSON
    } catch (err) {
        logRequest(req, 'Error fetching damage types', { error: err.message }); // Log error
        res.render('500', { message: 'Error fetching damage types' });
    }
});

// Route to add a new renting location
router.post('/location/add', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const { name } = req.body;
    try {
        const newLocation = new Location({ name });
        await newLocation.save();
        res.json({ message: 'Renting location added successfully' });
    } catch (error) {
        res.render('500', { message: 'Error adding location' });
    }
});

// Route to remove a renting location
router.delete('/location/remove/:id', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const locationId = req.params.id;
    try {
        await Location.findByIdAndDelete(locationId);
        res.json({ message: 'Renting location removed successfully' });
    } catch (error) {
        res.render('500', { message: 'Error removing location' });
    }
});

// Route to update max file sizes
router.post('/api/settings/file-sizes', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    try {
        // Update the MAX_FILE_SIZES constant
        Object.assign(global.MAX_FILE_SIZES, req.body);
        res.json({ message: 'File size limits updated successfully' });
    } catch (error) {
        res.render('500', { message: 'Error updating file sizes' });
    }
});

// Route to update max files per category
router.post('/api/settings/file-counts', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    try {
        // Update the MAX_FILES_PER_CATEGORY constant
        Object.assign(global.MAX_FILES_PER_CATEGORY, req.body);
        res.json({ message: 'File count limits updated successfully' });
    } catch (error) {
        res.render('500', { message: 'Error updating file counts' });
    }
});

// Route to update allowed file types
router.post('/api/settings/file-types', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    try {
        // Update the ALLOWED_FILE_TYPES constant
        Object.assign(global.ALLOWED_FILE_TYPES, req.body);
        res.json({ message: 'Allowed file types updated successfully' });
    } catch (error) {
        res.render('500', { message: 'Error updating file types' });
    }
});

// Add this route to handle the general settings page
router.get('/settings', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    try {
        // Fetch all locations, statuses, and damage types
        const [locations, statuses, damageTypes, dbSettings] = await Promise.all([
            Location.find().sort('name'),
            Status.find().sort('name'),
            DamageType.find().sort('name'),
            Settings.find()
        ]);

        // Convert settings array to object by type
        const settingsObj = dbSettings.reduce((acc, setting) => {
            acc[setting.type] = setting;
            return acc;
        }, {});

        res.render('general_settings', {
            locations,
            statuses,
            damageTypes,
            dbSettings: settingsObj
        });
    } catch (error) {
        console.error('Error fetching settings data:', error);
        res.render('500', { 
            message: 'Error loading settings page'
        });
    }
});

// Add these API routes for managing settings
router.post('/api/settings/:type', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    const { type } = req.params;
    const { name } = req.body;

    try {
        let result;
        switch (type.toLowerCase()) {
            case 'location':
                result = await Location.create({ name });
                break;
            case 'status':
                result = await Status.create({ name });
                break;
            case 'damagetype':
                result = await DamageType.create({ name });
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid type' });
        }
        res.json({ success: true, data: result });
    } catch (error) {
        res.render('500', { message: 'Error adding setting' });
    }
});

router.put('/api/settings/:type/:id', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    const { type, id } = req.params;
    const { name } = req.body;

    try {
        let result;
        switch (type.toLowerCase()) {
            case 'location':
                result = await Location.findByIdAndUpdate(id, { name }, { new: true });
                break;
            case 'status':
                result = await Status.findByIdAndUpdate(id, { name }, { new: true });
                break;
            case 'damagetype':
                result = await DamageType.findByIdAndUpdate(id, { name }, { new: true });
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid type' });
        }
        res.json({ success: true, data: result });
    } catch (error) {
        res.render('500', { message: 'Error updating setting' });
    }
});

router.delete('/api/settings/:type/:id', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    const { type, id } = req.params;

    try {
        let result;
        switch (type.toLowerCase()) {
            case 'location':
                result = await Location.findByIdAndDelete(id);
                break;
            case 'status':
                result = await Status.findByIdAndDelete(id);
                break;
            case 'damagetype':
                result = await DamageType.findByIdAndDelete(id);
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid type' });
        }
        res.json({ success: true, data: result });
    } catch (error) {
        res.render('500', { message: 'Error removing setting' });
    }
});

// Route to update invoice total
router.put('/:id/invoice-total', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const claimId = req.params.id;
    const { fileName, total } = req.body;

    try {
        // Find the claim
        const claim = await Claim.findById(claimId);
        if (!claim) {
            console.error(`Claim not found with ID: ${claimId}`);
            return res.status(404).json({ 
                success: false, 
                message: 'Claim not found' 
            });
        }

        // Find and update the specific invoice total
        const invoiceIndex = claim.invoiceTotals.findIndex(inv => inv.fileName === fileName);
        if (invoiceIndex !== -1) {
            // Log the update
            console.log(`Updating invoice total for ${fileName}:`, {
                oldTotal: claim.invoiceTotals[invoiceIndex].total,
                newTotal: total
            });

            // Update the total
            claim.invoiceTotals[invoiceIndex].total = parseFloat(total);
            await claim.save();

            // Return success with updated data
            res.json({ 
                success: true,
                data: {
                    invoiceTotal: claim.invoiceTotals[invoiceIndex],
                    adminFee: calculateAdminFee(claim.invoiceTotals)
                }
            });
        } else {
            console.error(`Invoice not found: ${fileName} in claim ${claimId}`);
            res.status(404).json({ 
                success: false, 
                message: 'Invoice not found' 
            });
        }
    } catch (error) {
        console.error('Error updating invoice total:', error);
        res.render('500', { message: 'Error updating invoice total' });
    }
});

// Helper function to calculate admin fee
function calculateAdminFee(invoiceTotals) {
    const totalInvoices = invoiceTotals.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    let adminFee = 0;
    
    if (totalInvoices >= 100 && totalInvoices < 500) {
        adminFee = 50;
    } else if (totalInvoices >= 500 && totalInvoices < 1500) {
        adminFee = 100;
    } else if (totalInvoices >= 1500) {
        adminFee = 150;
    }
    
    return adminFee;
}

module.exports = router; // Export the router