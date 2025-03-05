/**
 * @fileoverview This file defines the routes for handling claims in the Budget Claims System.
 * It includes routes for exporting claims as PDF, adding new claims, searching for claims,
 * fetching all claims, and updating existing claims. The routes are protected by authentication
 * and role-based access control middleware.
 */

const express = require('express');
const router = express.Router();
const Claim = require('../models/Claim');
const path = require('path');
const { ensureAuthenticated, ensureRoles, ensureRole } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');
const { logRequest } = require('../middleware/requestLogger');
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

// Middleware for file uploads
router.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    useTempFiles: true,
    tempFileDir: '/tmp/',
    debug: process.env.NODE_ENV === 'development'
}));

// Helper function to validate file
const validateFile = (file, category) => {
    // Check if file and category are provided
    if (!file || !category) {
        return ['Invalid file or category provided'];
    }
    
    // Check if file has name and size properties
    if (!file.name || typeof file.size !== 'number') {
        return ['Invalid file object provided'];
    }
    
    // Check if category is valid
    if (!['photos', 'documents', 'invoices'].includes(category)) {
        return [`Invalid category: ${category}. Must be one of: photos, documents, invoices`];
    }
    
    // Check if global settings exist
    if (!global.ALLOWED_FILE_TYPES || !global.MAX_FILE_SIZES) {
        return ['File validation settings not configured'];
    }
    
    const ext = path.extname(file.name).toLowerCase();
    const allowedTypes = category === 'photos' ? global.ALLOWED_FILE_TYPES.photos :
                        category === 'invoices' ? global.ALLOWED_FILE_TYPES.invoices :
                        global.ALLOWED_FILE_TYPES.documents;

    const sizeLimit = category === 'photos' ? global.MAX_FILE_SIZES.photos :
                     category === 'invoices' ? global.MAX_FILE_SIZES.invoices :
                     global.MAX_FILE_SIZES.documents;

    const errors = [];

    // Check file type with more user-friendly message
    if (!allowedTypes.includes(ext)) {
        errors.push(`${file.name}: File type not allowed. Please use ${allowedTypes.join(', ')} for ${category}`);
    }

    // Check file size with more user-friendly message
    if (file.size > sizeLimit) {
        const sizeMB = Math.round(sizeLimit / (1024 * 1024));
        errors.push(`${file.name}: File is too large. Maximum size allowed is ${sizeMB}MB`);
    }

    // Check file name with more user-friendly message
    if (file.name.length > 100 || /[<>:"/\\|?*]/.test(file.name)) {
        errors.push(`${file.name}: File name is invalid. Please remove special characters and ensure name is less than 100 characters`);
    }

    return errors;
};

// Helper function to sanitize filename
const sanitizeFilename = (filename) => {
    if (!filename) {
        return `unnamed_file_${Date.now()}`;
    }
    
    // Extract file extension
    const extension = path.extname(filename);
    const nameWithoutExt = path.basename(filename, extension);
    
    // Sanitize the filename by replacing invalid characters with underscores
    const sanitized = nameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    // Add timestamp for uniqueness and keep original extension
    return `${sanitized}_${Date.now()}${extension.toLowerCase()}`;
};

// Function to filter out sensitive fields from the request body
const filterSensitiveData = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }
    
    // List of sensitive field names that should be redacted
    const sensitiveFields = ['password', 'token', 'ssn', 'creditCard', 
                           'customerDriversLicense', 'securityQuestion', 'securityAnswer'];
    
    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => filterSensitiveData(item));
    }
    
    // Handle objects
    const filtered = { ...data };
    
    for (const [key, value] of Object.entries(filtered)) {
        // Check if this key should be redacted
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            filtered[key] = '[REDACTED]';
        } 
        // Recursively filter nested objects and arrays
        else if (value && typeof value === 'object') {
            filtered[key] = filterSensitiveData(value);
        }
    }
    
    return filtered;
};

// Helper function to initialize file categories
const initializeFileCategories = (existingFiles = {}) => {
    const categories = ['photos', 'documents', 'invoices'];
    const files = { ...existingFiles };
    
    categories.forEach(category => {
        if (!files[category]) {
            files[category] = [];
        }
    });
    
    return files;
};

// Route to export a claim as PDF
router.get('/:id/export', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), async (req, res) => {
    const claimId = req.params.id;
    logRequest(req, `Exporting claim to PDF with ID: ${claimId}`);

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
        const statuses = await Status.find().sort({ name: 1 });
        const locations = await Location.find().sort({ name: 1 });
        const damageTypes = await DamageType.find().sort({ name: 1 });
        const claim = {
            invoice: '',
            amount: ''
        };

        logRequest(req, 'Add claim route accessed');

        res.render('add_claim', {
            title: 'Add Claim',
            statuses,
            locations,
            damageTypes,
            claim,
            nonce: res.locals.nonce
        });
    } catch (error) {
        logger.error('Error loading add claim form:', error);
        res.status(500).render('500', { message: 'Error loading add claim form' });
    }
});

// Route to display the express claim form
router.get('/express', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), async (req, res) => {
    try {
        logRequest(req, 'Express claim route accessed');
        res.render('express_claim', {
            title: 'Express Claim',
            nonce: res.locals.nonce
        });
    } catch (error) {
        logRequest(req, 'Error accessing express claim form:', { error });
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

// POST /claims/:id/assign - Assign claim to user
router.post('/:id/assign', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('assign_claim'), async (req, res) => {
    try {
        // Fetch necessary data for the search form
        const damageTypes = await DamageType.find().sort({ name: 1 });
        const statuses = await Status.find().sort({ name: 1 });
        const locations = await Location.find().sort({ name: 1 });

        // Extract query parameters
        const { mva, customerName, vin, claimNumber, damageType, status, raNumber, dateOfLossStart, dateOfLossEnd, startDate, endDate } = req.query;

        // Build a filter object based on provided query parameters
        let filter = {};
        if (mva) filter.mva = mva;
        if (customerName) filter.customerName = new RegExp(customerName, 'i'); // Case-insensitive search
        if (vin) filter.carVIN = new RegExp(vin, 'i'); // Case-insensitive search for VIN
        if (claimNumber) filter.claimNumber = new RegExp(claimNumber, 'i'); // Case-insensitive search for claim number
        if (damageType) filter.damageType = { $in: Array.isArray(damageType) ? damageType : [damageType] }; // Search for any of the selected damage types
        if (status) {
            // Handle single status ID
            filter.status = status; // No need for $in since status should be a single value
        }
        if (raNumber) filter.raNumber = raNumber;
        if (dateOfLossStart || dateOfLossEnd) {
            filter.dateOfLoss = {};
            if (dateOfLossStart) filter.dateOfLoss.$gte = new Date(dateOfLossStart); // Filter by start date of loss
            if (dateOfLossEnd) filter.dateOfLoss.$lte = new Date(dateOfLossEnd); // Filter by end date of loss
        }
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate); // Filter by start date
            if (endDate) filter.date.$lte = new Date(endDate); // Filter by end date
        }

        // Add debug logging for statuses
        const allStatuses = await Status.find().sort({ name: 1 });
        logger.info('Available statuses:', allStatuses.map(s => ({ id: s._id, name: s.name })));

        // Get pagination parameters and fetch claims
        const page = parseInt(req.query.page) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage) || 10;
        const skip = (page - 1) * resultsPerPage;

        const totalClaims = await Claim.countDocuments(filter);
        const totalPages = Math.ceil(totalClaims / resultsPerPage);

        const claims = await Claim.find(filter)
            .populate('status')
            .skip(skip)
            .limit(resultsPerPage)
            .lean();

        // Process claims status
        claims.forEach(claim => {
            if (Array.isArray(claim.status)) {
                const statusName = claim.status[0];
                const matchingStatus = allStatuses.find(s => s.name === statusName);
                if (matchingStatus) {
                    claim.status = { _id: matchingStatus._id, name: matchingStatus.name };
                } else {
                    claim.status = { name: statusName };
                }
            }
        });

        // Build query string
        const queryString = Object.entries(req.query)
            .filter(([key]) => !['page', 'resultsPerPage'].includes(key))
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');

        // Check if this is an AJAX request
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({
                claims,
                page,
                totalPages,
                totalClaims,
                resultsPerPage,
                queryString: queryString ? `&${queryString}` : ''
            });
        }

        // Regular HTML response
        res.render('claims_search', {
            claims,
            filter,
            damageTypes,
            statuses: allStatuses,
            locations,
            resultsPerPage,
            page,
            totalPages,
            totalClaims,
            queryString: queryString ? `&${queryString}` : ''
        });
    } catch (err) {
        logger.error('Search route error:', err);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({ error: err.message });
        }
        res.status(500).render('500', { message: 'Error processing search' });
    }
});

// Route to get all claims or filter claims based on query parameters, accessible by admin, manager, and employee
router.get('/', ensureAuthenticated, logActivity('view_claims'), async (req, res) => {
    try {
        // Get pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get filter parameters
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.location) filter.rentingLocation = req.query.location;
        if (req.query.damageType) filter.damageType = req.query.damageType;

        // Get claims with pagination and filters
        const [claims, total] = await Promise.all([
            Claim.find(filter)
                .populate('status')
                .populate('rentingLocation')
                .populate('damageType')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .exec(),
            Claim.countDocuments(filter)
        ]);

        // If JSON is requested, return JSON response
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({
                claims,
                page,
                totalPages: Math.ceil(total / limit),
                total
            });
        }

        // Otherwise render the view
        res.render('claims/index', {
            claims,
            page,
            totalPages: Math.ceil(total / limit),
            total,
            query: req.query
        });
    } catch (err) {
        logger.error('Error fetching claims:', err);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({ error: err.message });
        }
        res.status(500).render('error', { error: err });
    }
});

// Route to add a new location
router.post('/locations', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        const { name } = req.body;
        const newLocation = new Location({ name });
        await newLocation.save();
        res.status(201).json({ message: 'Location added successfully' });
    } catch (error) {
        logger.error('Error adding location:', error);
        res.status(500).render('500', { message: 'Error adding location' });
    }
});

// Route to get a specific claim by ID for editing, accessible by admin and manager
router.get('/:id/edit', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('view_claim_edit'), async (req, res) => {
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
router.put('/:id', ensureAuthenticated, logActivity('update_claim'), async (req, res) => {
    try {
        const claimId = req.params.id;
        logger.info('Incoming request body:', req.body);

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
                logger.error('Error parsing new note:', e);
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
router.delete('/:id', ensureAuthenticated, logActivity('delete_claim'), async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.id);
        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        await claim.deleteOne();
        res.status(200).json({ msg: 'Claim deleted' });
    } catch (error) {
        logger.error('Error deleting claim:', error);
        res.render('500', { message: 'Error deleting claim' });
    }
});

// Route for bulk updating claims, accessible by admin and manager
router.put('/bulk/update', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('bulk_update_claims'), async (req, res) => {
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
router.post('/bulk/export', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('bulk_export_claims'), async (req, res) => {
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
router.get('/:id', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), logActivity('view_claim_details'), async (req, res) => {
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
});

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
        logger.error('Error fetching settings data:', error);
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
        let message;
        switch (type.toLowerCase()) {
            case 'location':
                result = await Location.create({ name });
                message = 'location added successfully';
                break;
            case 'status':
                result = await Status.create({ name });
                message = 'status added successfully';
                break;
            case 'damagetype':
                result = await DamageType.create({ name });
                message = 'damage type added successfully';
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid type' });
        }
        res.json({ success: true, data: result, message });
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
            logger.error(`Claim not found with ID: ${claimId}`);
            return res.status(404).json({ 
                success: false, 
                message: 'Claim not found' 
            });
        }

        // Find and update the specific invoice total
        const invoiceIndex = claim.invoiceTotals.findIndex(inv => inv.fileName === fileName);
        if (invoiceIndex !== -1) {
            // Log the update
            logger.info(`Updating invoice total for ${fileName}:`, {
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
            logger.error(`Invoice not found: ${fileName} in claim ${claimId}`);
            res.status(404).json({ 
                success: false, 
                message: 'Invoice not found' 
            });
        }
    } catch (error) {
        logger.error('Error updating invoice total:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating invoice total',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Helper function to calculate admin fee based on total invoice amount
function calculateAdminFee(invoiceTotals) {
    // Handle edge cases - if invoiceTotals is null, undefined, or not an array
    if (!invoiceTotals || !Array.isArray(invoiceTotals)) {
        logger.warn('Invalid invoiceTotals provided to calculateAdminFee:', invoiceTotals);
        return 0;
    }
    
    // Calculate total by summing all invoice totals
    // Handle cases where total might be non-numeric or missing
    const totalInvoices = invoiceTotals.reduce((sum, invoice) => {
        // Skip invalid invoices
        if (!invoice || typeof invoice !== 'object') {
            return sum;
        }
        
        // Parse the total as a float (handles both string and number types)
        const invoiceTotal = parseFloat(invoice.total) || 0;
        
        // Make sure we have a valid number
        return sum + (isNaN(invoiceTotal) ? 0 : invoiceTotal);
    }, 0);
    
    // Define fee tiers
    // For amounts under $100, no fee
    // For $100-$499.99, $50 fee
    // For $500-$1499.99, $100 fee
    // For $1500+, $150 fee
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