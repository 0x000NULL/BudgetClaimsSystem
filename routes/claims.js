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
const { notifyNewClaim, notifyClaimStatusUpdate } = require('../notifications/notify'); // Import notification functions
const csv = require('csv-express'); // Import csv-express for CSV export
const ExcelJS = require('exceljs'); // Import ExcelJS for Excel export
const PDFDocument = require('pdfkit'); // Import PDFKit for PDF export
const fs = require('fs'); // Import File System to handle file operations
const cacheManager = require('cache-manager'); // Import cache manager for caching
const { redisStore } = require('cache-manager-redis-store'); // Import Redis store for cache manager
const pinoLogger = require('../logger'); // Import Pino logger
const Status = require('../models/Status'); // Import Status model
const Location = require('../models/Location'); // Import Location model
const DamageType = require('../models/DamageType'); // Import DamageType model
const fileUpload = require('express-fileupload');
const Settings = require('../models/Settings'); // Import Settings model

// Setup cache manager with Redis
const cache = cacheManager.caching({
    store: redisStore,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    ttl: 600 // Time-to-live for cached data (in seconds)
});

// Helper function to validate file
const validateFile = (file, category) => {
    // Get the file extension
    const ext = path.extname(file.name).toLowerCase();
    
    // Determine allowed types based on category
    const allowedTypes = category === 'photos' ? global.ALLOWED_FILE_TYPES.photos :
                        category === 'invoices' ? global.ALLOWED_FILE_TYPES.invoices :
                        global.ALLOWED_FILE_TYPES.documents;

    // Get size limit based on category
    const sizeLimit = category === 'photos' ? global.MAX_FILE_SIZES.photos :
                     category === 'invoices' ? global.MAX_FILE_SIZES.invoices :
                     global.MAX_FILE_SIZES.documents;

    const errors = [];

    // Check file type
    if (!allowedTypes.includes(ext)) {
        errors.push(`Invalid file type. Allowed types for ${category}: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > sizeLimit) {
        errors.push(`File size exceeds limit of ${sizeLimit / (1024 * 1024)}MB`);
    }

    // Check file name length and characters
    if (file.name.length > 100) {
        errors.push('File name is too long (max 100 characters)');
    }

    // Check for special characters in filename (except - and _)
    if (/[^a-zA-Z0-9-_.]/.test(file.name)) {
        errors.push('File name contains invalid characters');
    }

    return errors;
};

// Helper function to sanitize filename
const sanitizeFilename = async (filename, uploadDir) => {
    // Remove special characters except - and _
    const sanitized = filename
        .replace(/[^a-zA-Z0-9-_.]/, '_')
        .replace(/_{2,}/g, '_');
    
    // Check if file already exists
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    let finalName = sanitized;
    let counter = 1;

    // If file exists, add timestamp only then
    while (fs.existsSync(path.join(uploadDir, finalName))) {
        finalName = `${name}_${Date.now()}${ext}`;
        if (counter++ > 100) break; // Prevent infinite loop
    }

    return finalName;
};

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
/**
 * Logs an HTTP request with relevant details using pinoLogger.
 *
 * @param {Object} req - The HTTP request object.
 * @param {string} message - A custom log message.
 * @param {Object} [extra={}] - Additional information to log.
 * @param {string} [extra.someKey] - Example of additional information.
 *
 * @property {string} req.method - The HTTP method of the request.
 * @property {string} req.originalUrl - The original URL of the request.
 * @property {Object} req.headers - The headers of the request.
 * @property {Object} req.body - The body of the request.
 * @property {Object} req.user - The user object, if authenticated.
 * @property {string} req.user.email - The email of the authenticated user.
 * @property {string} req.ip - The IP address of the request.
 * @property {string} req.sessionID - The session ID of the request.
 *
 * @returns {void}
 */
const logRequest = (req, message, extra = {}) => {
    const { method, originalUrl, headers, body } = req;
    const filteredBody = filterSensitiveData(body); // Filter sensitive data from the request body

    pinoLogger.info({
        message,
        user: req.user ? req.user.email : 'Unauthenticated',
        ip: req.ip,
        sessionId: req.sessionID,
        method,
        url: originalUrl,
        headers: {
            'User-Agent': headers['user-agent'],
            'Referer': headers['referer'],
            // Add other headers if needed
        },
        requestBody: filteredBody, // Log the filtered request body
        timestamp: new Date().toISOString(),
        ...extra
    });
};

// Initialize file categories if not present
const initializeFileCategories = (files) => {
    return {
        incidentReports: files.incidentReports || [],
        correspondence: files.correspondence || [],
        rentalAgreement: files.rentalAgreement || [],
        policeReport: files.policeReport || [],
        invoices: files.invoices || [],
        photos: files.photos || []
    };
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
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), logActivity('Viewed claims list'), async (req, res) => {
    logRequest(req, 'Fetching claims with query:', { query: req.query });
    const { mva, customerName, status, startDate, endDate } = req.query; // Extract query parameters

    // Build a filter object based on provided query parameters
    let filter = {};
    if (mva) filter.mva = mva;
    if (customerName) filter.customerName = new RegExp(customerName, 'i'); // Case-insensitive search
    if (status) filter.status = status;
    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate); // Filter by start date
        if (endDate) filter.date.$lte = new Date(endDate); // Filter by end date
    }

    //const cacheKey = JSON.stringify(filter); // Create a cache key based on the filter

    try {
        // Attempt to get the cached data
        //const cachedClaims = await cache.get(cacheKey);
        //if (cachedClaims) {
            //logRequest(req, 'Returning cached claims data:', { cachedClaims });
            // If cached data exists, respond with it
            //return res.json(cachedClaims);
        //}

        // If no cached data, fetch claims from the database
        const claims = await Claim.find(filter).exec();
        logRequest(req, 'Claims fetched from database:', { claims });
        // Cache the fetched data
        //await cache.set(cacheKey, claims);
        // Respond with the fetched data
        res.json(claims);
    } catch (err) {
        logRequest(req, 'Error fetching claims:', { error: err });
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// Route to add a new claim, accessible by admin and manager
router.post('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Added new claim'), async (req, res) => {
    logRequest(req, 'Adding new claim with data:', { 
        body: req.body,
        files: req.files,
        headers: req.headers
    });
    
    const {
        mva, customerName, description, status, damageType, dateOfLoss, raNumber, rentingLocation,
        ldwAccepted, policeDepartment, policeReportNumber, claimCloseDate, vehicleOdometer,
        customerNumber, customerEmail, customerAddress, customerDriversLicense, carMake,
        carModel, carYear, carColor, carVIN, accidentDate, billable, isRenterAtFault,
        damagesTotal, bodyShopName, insuranceCarrier, insuranceAgent, insurancePhoneNumber,
        insuranceFaxNumber, insuranceAddress, insuranceClaimNumber, thirdPartyName,
        thirdPartyPhoneNumber, thirdPartyInsuranceName, thirdPartyPolicyNumber,
        rentersLiabilityInsurance, lossDamageWaiver, invoice, amount // Add these fields
    } = req.body;

    let files = initializeFileCategories({});
    let invoiceTotals = [];

    if (req.files) {
        try {
            const fileErrors = [];
            const processedFiles = {};

            // First, validate all files
            for (const category of Object.keys(req.files)) {
                const categoryFiles = Array.isArray(req.files[category]) 
                    ? req.files[category] 
                    : [req.files[category]];

                // Check number of files in category
                if (categoryFiles.length > global.MAX_FILES_PER_CATEGORY[category]) {
                    fileErrors.push(`Too many files in ${category}. Maximum allowed: ${global.MAX_FILES_PER_CATEGORY[category]}`);
                    continue;
                }

                processedFiles[category] = [];

                for (const file of categoryFiles) {
                    const validationErrors = validateFile(file, category);
                    if (validationErrors.length > 0) {
                        fileErrors.push(...validationErrors.map(err => `${file.name}: ${err}`));
                    } else {
                        processedFiles[category].push(file);
                    }
                }
            }

            // If there are any validation errors, return them
            if (fileErrors.length > 0) {
                return res.status(400).json({ 
                    error: 'File validation failed', 
                    details: fileErrors 
                });
            }

            // Process valid files
            for (const [category, categoryFiles] of Object.entries(processedFiles)) {
                for (const file of categoryFiles) {
                    const sanitizedFilename = sanitizeFilename(file.name);
                    const filePath = path.join(__dirname, '../public/uploads', sanitizedFilename);

                    // Create upload directory if it doesn't exist
                    const uploadDir = path.dirname(filePath);
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }

                    // Move file with sanitized name
                    await file.mv(filePath);
                    logRequest(req, 'File uploaded successfully:', { 
                        originalName: file.name,
                        sanitizedName: sanitizedFilename 
                    });

                    files[category].push(sanitizedFilename);
                    
                    if (category === 'invoices') {
                        const total = parseFloat(req.body[`invoiceTotal_${file.name}`]) || 0;
                        invoiceTotals.push({ 
                            fileName: sanitizedFilename, 
                            originalName: file.name,
                            total 
                        });
                    }
                }
            }
        } catch (err) {
            logRequest(req, 'Error uploading files:', { error: err });
            return res.status(500).json({ 
                error: 'File upload failed',
                details: err.message 
            });
        }
    }

    const newClaim = new Claim({
        mva, customerName, description, status, damageType, dateOfLoss, raNumber, rentingLocation,
        ldwAccepted, policeDepartment, policeReportNumber, claimCloseDate, vehicleOdometer,
        customerNumber, customerEmail, customerAddress, customerDriversLicense, carMake,
        carModel, carYear, carColor, carVIN, accidentDate, billable, isRenterAtFault,
        damagesTotal, bodyShopName, insuranceCarrier, insuranceAgent, insurancePhoneNumber,
        insuranceFaxNumber, insuranceAddress, insuranceClaimNumber, thirdPartyName,
        thirdPartyPhoneNumber, thirdPartyInsuranceName, thirdPartyPolicyNumber,
        rentersLiabilityInsurance, lossDamageWaiver, invoice, amount, // Add these fields
        files,
        invoiceTotals // Add invoice totals
    });

    try {
        const claim = await newClaim.save();
        logRequest(req, 'New claim added:', { claim });
        notifyNewClaim(req.user.email, claim);
        //cache.store.del('/claims');
        res.redirect('/dashboard');
    } catch (err) {
        logRequest(req, 'Error adding new claim:', { error: err });
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ message: 'Error adding location', error });
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

        
// Route to update a claim by ID, accessible by admin and manager
router.put('/:id', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Updated claim'), async (req, res) => {
    const claimId = req.params.id;
    logRequest(req, `Updating claim with ID: ${claimId}`);

    try {
        // Fetch the claim from the database
        const claim = await Claim.findById(claimId);
        
        if (!claim) {
            logRequest(req, `Claim with ID ${claimId} not found`, { level: 'error' });
            return res.status(404).json({ error: 'Claim not found' });
        }

        // Perform validation here (e.g., using express-validator or custom logic)
        const errors = {}; // Initialize an empty object to store error messages

        if (!req.body.customerName) {
            errors.customerName = { msg: 'Customer Name is required' };
        }
        // Perform other field validations as necessary

        // If there are errors, re-render the edit view with the errors object
        if (Object.keys(errors).length > 0) {
            const statuses = await Status.find().sort({ name: 1 });
            const rentingLocations = await Location.find().sort({ name: 1 });
            const damageTypes = await DamageType.find().sort({ name: 1 });

            return res.render('claims_edit', { 
                title: 'Edit Claim', 
                claim, 
                statuses, 
                rentingLocations, 
                damageTypes, 
                errors 
            });
        }

        // Initialize files with existing files from the claim
        let files = {
            incidentReports: [...(claim.files?.incidentReports || [])],
            correspondence: [...(claim.files?.correspondence || [])],
            rentalAgreement: [...(claim.files?.rentalAgreement || [])],
            policeReport: [...(claim.files?.policeReport || [])],
            invoices: [...(claim.files?.invoices || [])],
            photos: [...(claim.files?.photos || [])]
        };

        // Process new file uploads
        if (req.files) {
            try {
                for (const category in req.files) {
                    const categoryFiles = Array.isArray(req.files[category]) 
                        ? req.files[category] 
                        : [req.files[category]];

                    for (const file of categoryFiles) {
                        // Validate file
                        const validationErrors = validateFile(file, category);
                        if (validationErrors.length > 0) {
                            return res.status(400).json({ 
                                error: 'File validation failed', 
                                details: validationErrors 
                            });
                        }

                        const uploadDir = path.join(__dirname, '../public/uploads');
                        
                        // Create upload directory if it doesn't exist
                        if (!fs.existsSync(uploadDir)) {
                            fs.mkdirSync(uploadDir, { recursive: true });
                        }

                        // Sanitize filename and handle duplicates
                        const sanitizedFilename = await sanitizeFilename(file.name, uploadDir);
                        const filePath = path.join(uploadDir, sanitizedFilename);

                        // Move file
                        await file.mv(filePath);
                        
                        // Add file to appropriate category
                        files[category].push(sanitizedFilename);
                        
                        logRequest(req, 'File uploaded successfully:', { 
                            originalName: file.name,
                            sanitizedName: sanitizedFilename,
                            category 
                        });
                    }
                }
            } catch (err) {
                logRequest(req, 'Error processing uploaded files:', { error: err });
                return res.status(500).json({ 
                    error: 'File upload failed',
                    details: err.message 
                });
            }
        }

        // Process invoice totals
        const invoiceTotals = req.body.invoiceTotals || [];
        const updatedInvoiceTotals = Array.isArray(invoiceTotals) ? invoiceTotals.map(invoice => ({
            fileName: invoice.fileName,
            total: parseFloat(invoice.total) || 0 // Ensure total is a number
        })) : [];

        // Update claim data
        const updatedClaimData = {
            ...req.body, // Spread all form fields
            files, // Add processed files
            invoiceTotals: updatedInvoiceTotals
        };

        // Save version history
        if (!claim.versions) {
            claim.versions = [];
        }
        claim.versions.push({
            description: claim.description,
            status: claim.status,
            files: claim.files,
            updatedAt: claim.updatedAt
        });

        const updatedClaim = await Claim.findByIdAndUpdate(
            claimId, 
            updatedClaimData, 
            { new: true, runValidators: true }
        );

        logRequest(req, 'Claim updated:', { claim: updatedClaim });
        
        // Redirect to the claim's view page
        res.redirect(`/claims/${claimId}`);
    } catch (err) {
        logRequest(req, 'Error updating claim:', { error: err });
        res.status(500).render('500', { 
            message: 'Error updating claim: ' + err.message 
        });
    }
});


// Route to delete a claim by ID, accessible only by admin
router.delete('/:id', ensureAuthenticated, ensureRole('admin'), logActivity('Deleted claim'), async (req, res) => {
    const claimId = req.params.id;

    logRequest(req, 'Deleting claim with ID:', { claimId });

    try {
        const claim = await Claim.findByIdAndDelete(claimId);
        if (!claim) {
            logRequest(req, `Claim with ID ${claimId} not found`, { level: 'error' });
            return res.status(404).json({ error: 'Claim not found' });
        }
        logRequest(req, 'Claim deleted:', { claimId });
        res.json({ msg: 'Claim deleted' }); // Respond with deletion confirmation
        //cache.del(`claim_${claimId}`); // Invalidate the cache for the deleted claim
        //cache.del('/claims'); // Invalidate the cache for claims list
    } catch (err) {
        logRequest(req, 'Error deleting claim:', { error: err });
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: err.message }); // Handle errors
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
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// Route to remove a status
router.delete('/status/remove/:id', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const statusId = req.params.id;

    try {
        await Status.findByIdAndDelete(statusId);
        res.status(200).json({ message: 'Status removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to remove a damage type
router.delete('/damage-type/remove/:id', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const damageTypeId = req.params.id;

    try {
        await DamageType.findByIdAndDelete(damageTypeId);
        res.status(200).json({ message: 'Damage Type removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: err.message }); // Handle errors
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
        res.status(500).json({ error: error.message });
    }
});

// Route to remove a renting location
router.delete('/location/remove/:id', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const locationId = req.params.id;
    try {
        await Location.findByIdAndDelete(locationId);
        res.json({ message: 'Renting location removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to update max file sizes
router.post('/api/settings/file-sizes', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    try {
        // Update the MAX_FILE_SIZES constant
        Object.assign(global.MAX_FILE_SIZES, req.body);
        res.json({ message: 'File size limits updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to update max files per category
router.post('/api/settings/file-counts', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    try {
        // Update the MAX_FILES_PER_CATEGORY constant
        Object.assign(global.MAX_FILES_PER_CATEGORY, req.body);
        res.json({ message: 'File count limits updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to update allowed file types
router.post('/api/settings/file-types', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    try {
        // Update the ALLOWED_FILE_TYPES constant
        Object.assign(global.ALLOWED_FILE_TYPES, req.body);
        res.json({ message: 'Allowed file types updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        res.status(500).render('500', { 
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
        res.status(500).json({ success: false, message: error.message });
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
        res.status(500).json({ success: false, message: error.message });
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
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router; // Export the router