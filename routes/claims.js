/**
 * @fileoverview This file defines the routes for handling claims in the Budget Claims System.
 * It includes routes for exporting claims as PDF, adding new claims, searching for claims,
 * fetching all claims, and updating existing claims. The routes are protected by authentication
 * and role-based access control middleware.
 * 
 * @requires express
 * @requires ../models/Claim
 * @requires path
 * @requires ../middleware/auth
 * @requires ../middleware/activityLogger
 * @requires ../notifications/notify
 * @requires csv-express
 * @requires exceljs
 * @requires pdfkit
 * @requires fs
 * @requires cache-manager
 * @requires cache-manager-redis-store
 * @requires ../logger
 * @requires ../models/Status
 * @requires ../models/Location
 * @requires ../models/DamageType
 */

const express = require('express'); // Import Express to create a router
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const path = require('path'); // Import Path to handle file and directory paths
const { ensureAuthenticated, ensureRoles, ensureRole } = require('../middleware/auth'); // Import authentication and role-checking middleware
const logActivity = require('../middleware/activityLogger'); // Import activity logging middleware
const { notifyNewClaim, notifyClaimStatusUpdate, notifyClaimAssigned, notifyClaimUpdated } = require('../notifications/notify'); // Import notification functions
const csv = require('csv-express'); // Import csv-express for CSV export
const ExcelJS = require('exceljs'); // Import ExcelJS for Excel export
const PDFDocument = require('pdfkit'); // Import PDFKit for PDF export
const fs = require('fs'); // Import File System to handle file operations
const cacheManager = require('cache-manager'); // Import cache manager for caching
const redisStore = require('cache-manager-redis-store'); // Import Redis store for cache manager
const pinoLogger = require('../logger'); // Import Pino logger
const Status = require('../models/Status'); // Import Status model
const Location = require('../models/Location'); // Import Location model
const DamageType = require('../models/DamageType'); // Import DamageType model
const fileUpload = require('express-fileupload');
const Settings = require('../models/Settings'); // Import Settings model
const uploadsPath = require('../config/settings');
const logRequest = require('../middleware/auditLogger');
const logger = require('../logger');

// Setup cache manager with Redis
const cache = cacheManager.caching({
    store: redisStore,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    ttl: 600 // Time-to-live for cached data (in seconds)
});

// Helper function to validate file
const validateFile = (file, category) => {
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
    return filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
};

const router = express.Router(); // Create a new router

// Define sensitive fields that should not be logged
const sensitiveFields = ['password', 'token', 'ssn'];

// Function to filter out sensitive fields from the request body
const filterSensitiveData = (data) => {
    const filtered = { ...data };
    const sensitiveFields = ['password', 'token', 'ssn', 'creditCard'];
    
    sensitiveFields.forEach(field => {
        if (filtered[field]) {
            filtered[field] = '[REDACTED]';
        }
    });
    
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
        const claim = await Claim.findById(claimId);
        if (!claim) {
            logRequest(req, `Claim with ID ${claimId} not found`, { level: 'error' });
            return res.status(404).render('404', { message: 'Claim not found' });
        }

        const doc = new PDFDocument();
        const filename = `claim_${claimId}.pdf`;
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/pdf');

        doc.pipe(res);

        doc.text('Claim Report', { align: 'center' });
        doc.text(`MVA: ${claim.mva}`);
        doc.text(`Customer Name: ${claim.customerName}`);
        doc.text(`Customer Number: ${claim.customerNumber}`);
        doc.text(`Customer Email: ${claim.customerEmail}`);
        doc.text(`Customer Address: ${claim.customerAddress}`);
        doc.text(`Customer Drivers License: ${claim.customerDriversLicense}`);
        doc.text(`Car Make: ${claim.carMake}`);
        doc.text(`Car Model: ${claim.carModel}`);
        doc.text(`Car Year: ${claim.carYear}`);
        doc.text(`Car Color: ${claim.carColor}`);
        doc.text(`Car VIN: ${claim.carVIN}`);
        doc.text(`Accident Date: ${claim.accidentDate ? new Date(claim.accidentDate).toLocaleDateString() : ''}`);
        doc.text(`Billable: ${claim.billable}`);
        doc.text(`Is Renter At Fault: ${claim.isRenterAtFault}`);
        doc.text(`Damages Total: ${claim.damagesTotal}`);
        doc.text(`Body Shop Name: ${claim.bodyShopName}`);
        doc.text(`RA Number: ${claim.raNumber}`);
        doc.text(`Insurance Carrier: ${claim.insuranceCarrier}`);
        doc.text(`Insurance Agent: ${claim.insuranceAgent}`);
        doc.text(`Insurance Phone Number: ${claim.insurancePhoneNumber}`);
        doc.text(`Insurance Fax Number: ${claim.insuranceFaxNumber}`);
        doc.text(`Insurance Address: ${claim.insuranceAddress}`);
        doc.text(`Insurance Claim Number: ${claim.insuranceClaimNumber}`);
        doc.text(`Third Party Name: ${claim.thirdPartyName}`);
        doc.text(`Third Party Phone Number: ${claim.thirdPartyPhoneNumber}`);
        doc.text(`Third Party Insurance Name: ${claim.thirdPartyInsuranceName}`);
        doc.text(`Third Party Policy Number: ${claim.thirdPartyPolicyNumber}`);
        doc.text(`Renting Location: ${claim.rentingLocation}`);
        doc.text(`LDW Accepted: ${claim.ldwAccepted}`);
        doc.text(`Police Department: ${claim.policeDepartment}`);
        doc.text(`Police Report Number: ${claim.policeReportNumber}`);
        doc.text(`Claim Close Date: ${claim.claimCloseDate ? new Date(claim.claimCloseDate).toLocaleDateString() : ''}`);
        doc.text(`Vehicle Odometer: ${claim.vehicleOdometer}`);
        doc.text(`Description: ${claim.description}`);
        doc.text(`Damage Type: ${claim.damageType}`);
        doc.text(`Status: ${claim.status}`);
        doc.text(`Date: ${new Date(claim.date).toLocaleDateString()}`);
        // New fields added to PDF export
        doc.text(`Renters Liability Insurance: ${claim.rentersLiabilityInsurance}`);
        doc.text(`Loss Damage Waiver: ${claim.lossDamageWaiver}`);
        doc.moveDown();

        // Ensure claim.files is defined
        const files = claim.files || {};
        /**
         * An array of file category objects, each containing a title and an array of files.
         * 
         * @typedef {Object} FileCategory
         * @property {string} title - The title of the file category.
         * @property {Array} files - An array of files belonging to the category.
         * 
         * @type {FileCategory[]}
         * @constant
         * @default
         * @example
         * const fileCategories = [
         *   { title: 'Incident Reports', files: [] },
         *   { title: 'Correspondence', files: [] },
         *   { title: 'Rental Agreement', files: [] },
         *   { title: 'Police Report', files: [] },
         *   { title: 'Invoices', files: [] },
         *   { title: 'Photos', files: [] }
         * ];
         */
        const fileCategories = [
            { title: 'Incident Reports', files: files.incidentReports || [] },
            { title: 'Correspondence', files: files.correspondence || [] },
            { title: 'Rental Agreement', files: files.rentalAgreement || [] },
            { title: 'Police Report', files: files.policeReport || [] },
            { title: 'Invoices', files: files.invoices || [] },
            { title: 'Photos', files: files.photos || [] }
        ];

        for (const category of fileCategories) {
            doc.text(`${category.title}:`);
            for (const file of category.files) {
                doc.text(file);
                const filePath = path.join(__dirname, '../public/uploads', file);
                try {
                    if (file.match(/\.(png|jpg|jpeg)$/i)) {
                        doc.image(filePath, { fit: [250, 300], align: 'center' });
                    } else if (file.match(/\.pdf$/i)) {
                        doc.addPage().text(`Embedded PDF: ${file}`, { align: 'center' });
                        doc.file(filePath);
                        doc.fileAttachmentAnnotation(250, 300, 100, 50, filePath, { description: `Embedded PDF: ${file}` });
                    } else {
                        doc.text('Unsupported file format for embedding. Click link to access: ');
                        doc.text(`${filePath}`, { link: filePath });
                    }
                } catch (error) {
                    logRequest(req, 'Error adding file to PDF:', { error });
                    doc.text('Error loading file.');
                }
                doc.moveDown();
            }
        }

        doc.end();
    } catch (err) {
        logRequest(req, 'Error exporting claim to PDF:', { error: err });
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

// Route to display the add claim form
router.get('/add', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), async (req, res) => {
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
        res.status(500).json({ error: error.message });
    }
});



// Route to search for claims, accessible by admin, manager, and employee
router.get('/search', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), async (req, res) => {
    logRequest(req, 'Claims search route accessed');

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
        if (claimNumber) filter.insuranceClaimNumber = new RegExp(claimNumber, 'i'); // Case-insensitive search for claim number
        if (damageType) filter.damageType = { $in: Array.isArray(damageType) ? damageType : [damageType] }; // Search for any of the selected damage types
        if (status) filter.status = { $in: Array.isArray(status) ? status : [status] }; // Search for any of the selected statuses
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

        // Find claims based on the filter object
        const claims = await Claim.find(filter);

        logRequest(req, 'Claims found', { claims });

        // Render the view and pass the fetched data along with the filter
        res.render('claims_search', {
            claims,
            filter,
            damageTypes,
            statuses,
            locations, // Pass the locations to the view if necessary
            resultsPerPage: req.query.resultsPerPage || 10, // Default to 10 results per page if not specified
            page: req.query.page || 1, // Default to page 1 if not specified
            totalPages: Math.ceil(claims.length / (req.query.resultsPerPage || 10)), // Calculate total pages
            queryString: `&mva=${mva || ''}&customerName=${customerName || ''}&vin=${vin || ''}&claimNumber=${claimNumber || ''}&damageType=${damageType || ''}&status=${status || ''}` // Query string to maintain search criteria
        });
    } catch (err) {
        logRequest(req, 'Error fetching claims:', { error: err });
        res.status(500).json({ error: err.message });
    }
});


// Route to get all claims or filter claims based on query parameters, accessible by admin, manager, and employee
router.get('/', ensureAuthenticated, logActivity('view claims'), async (req, res) => {
    try {
        let query = {};
        if (req.query.status) {
            query.status = req.query.status;
        }
        const claims = await Claim.find(query).sort({ createdAt: -1 });
        res.json(claims);
    } catch (error) {
        logger.error('Error fetching claims:', error);
        res.render('500', { message: 'Error fetching claims' });
    }
});

// POST /claims - Add a new claim
router.post('/', ensureAuthenticated, logActivity('create claim'), async (req, res) => {
    try {
        const newClaim = new Claim({
            ...req.body,
            createdBy: req.user._id
        });
        await newClaim.save();
        await notifyNewClaim(req.user.email, newClaim);
        res.redirect(`/claims/${newClaim._id}`);
    } catch (error) {
        logger.error('Error creating claim:', error);
        res.render('500', { message: 'Error creating claim' });
    }
});

// Route to add a new location
router.post('/locations', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        const { location } = req.body;
        const newLocation = new Location({ name: location });
        await newLocation.save();
        res.status(201).json({ message: 'Location added successfully' });
    } catch (error) {
        res.render('500', { message: 'Error adding location' });
    }
});

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
        const claim = await Claim.findById(req.params.id);
        if (!claim) {
            logger.error('Claim not found:', req.params.id);
            return res.render('500', { message: 'Claim not found' });
        }

        // Handle file uploads
        if (req.files) {
            logger.info('Processing file uploads:', Object.keys(req.files));
            
            // Initialize files object if it doesn't exist
            if (!claim.files) {
                claim.files = {};
            }

            // Process each file category
            const categories = ['incidentReports', 'correspondence', 'rentalAgreement', 'policeReport', 'invoices', 'photos'];
            
            for (const category of categories) {
                if (req.files[category]) {
                    try {
                        const files = Array.isArray(req.files[category]) ? req.files[category] : [req.files[category]];
                        logger.info(`Processing ${files.length} files for category: ${category}`);
                        
                        // Initialize category array if it doesn't exist
                        if (!claim.files[category]) {
                            claim.files[category] = [];
                        }

                        for (const file of files) {
                            // Validate file
                            const errors = validateFile(file, category);
                            if (errors.length > 0) {
                                logger.error('File validation errors:', errors);
                                return res.render('500', { 
                                    message: `File validation failed: ${errors.join(', ')}` 
                                });
                            }

                            // Sanitize filename
                            const sanitizedFilename = sanitizeFilename(file.name);
                            const uploadPath = path.join(uploadsPath, sanitizedFilename);
                            logger.info(`Moving file to: ${uploadPath}`);

                            try {
                                // Ensure uploads directory exists
                                const uploadsDir = path.dirname(uploadPath);
                                if (!fs.existsSync(uploadsDir)) {
                                    fs.mkdirSync(uploadsDir, { recursive: true });
                                }

                                // Move file to uploads directory
                                await file.mv(uploadPath);
                                
                                // Add filename to claim's files array
                                claim.files[category].push(sanitizedFilename);
                                logger.info(`Successfully uploaded file: ${sanitizedFilename}`);
                            } catch (moveError) {
                                logger.error('Error moving file:', moveError);
                                return res.render('500', { 
                                    message: `Error uploading file: ${file.name}` 
                                });
                            }
                        }
                    } catch (categoryError) {
                        logger.error(`Error processing category ${category}:`, categoryError);
                        return res.render('500', { 
                            message: `Error processing ${category} files` 
                        });
                    }
                }
            }
        }

        // Update other claim fields
        logger.info('Updating claim fields');
        Object.assign(claim, req.body);
        
        // Save the updated claim
        try {
            await claim.save();
            await notifyClaimStatusUpdate(req.user.email, claim);
            logger.info('Claim updated successfully:', claim._id);
            res.redirect(`/claims/${claim._id}`);
        } catch (saveError) {
            logger.error('Error saving claim:', saveError);
            return res.render('500', { 
                message: 'Error saving claim updates' 
            });
        }
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