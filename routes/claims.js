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
const fs = require('fs').promises; // Import File System to handle file operations
const cacheManager = require('cache-manager'); // Import cache manager for caching
const redisStore = require('cache-manager-redis-store'); // Import Redis store for cache manager
const pinoLogger = require('../logger'); // Import Pino logger
const Status = require('../models/Status'); // Import Status model
const Location = require('../models/Location'); // Import Location model
const DamageType = require('../models/DamageType'); // Import DamageType model
const fileUpload = require('express-fileupload');
const Settings = require('../models/Settings'); // Import Settings model
const { uploadsPath } = require('../config/settings'); // Import uploadsPath from settings
const logRequest = require('../middleware/auditLogger');
const logger = require('../logger');
const { processRentalAgreement } = require('../services/processRentalAgreement'); // Import rental agreement processing service

// Create uploads directory if it doesn't exist
(async () => {
    try {
        // Ensure the main uploads directory exists
        await fs.promises.access(uploadsPath, fs.constants.F_OK);
        logger.info(`Uploads directory exists at ${uploadsPath}`);
    } catch (error) {
        try {
            await fs.promises.mkdir(uploadsPath, { recursive: true });
            logger.info(`Created uploads directory at ${uploadsPath}`);
        } catch (mkdirError) {
            logger.error(`Failed to create uploads directory at ${uploadsPath}: ${mkdirError.message}`);
        }
    }
    
    // Initialize all file categories
    const categories = [
        'photos', 
        'documents', 
        'invoices', 
        'incidentReports', 
        'correspondence', 
        'rentalAgreement', 
        'policeReport'
    ];
    
    // Create subdirectories for each category if they don't exist
    for (const category of categories) {
        const categoryPath = path.join(uploadsPath, category);
        try {
            await fs.promises.access(categoryPath, fs.constants.F_OK);
        } catch (error) {
            try {
                await fs.promises.mkdir(categoryPath, { recursive: true });
                logger.info(`Created directory for ${category} at ${categoryPath}`);
            } catch (mkdirError) {
                logger.error(`Failed to create directory for ${category}: ${mkdirError.message}`);
            }
        }
    }
})();

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
    
    // Map categories to their appropriate allowed types
    let allowedTypes;
    let sizeLimit;
    
    switch(category) {
        case 'photos':
            allowedTypes = global.ALLOWED_FILE_TYPES.photos;
            sizeLimit = global.MAX_FILE_SIZES.photos;
            break;
        case 'invoices':
            allowedTypes = global.ALLOWED_FILE_TYPES.invoices;
            sizeLimit = global.MAX_FILE_SIZES.invoices;
            break;
        case 'rentalAgreement':
        case 'policeReport':
        case 'incidentReports':
        case 'correspondence':
            // These categories should accept document types
            allowedTypes = global.ALLOWED_FILE_TYPES.documents;
            sizeLimit = global.MAX_FILE_SIZES.documents;
            break;
        default:
            // For any other category, use document types as default
            allowedTypes = global.ALLOWED_FILE_TYPES.documents;
            sizeLimit = global.MAX_FILE_SIZES.documents;
    }

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

// Helper function to check if a filename is already safe
const isSafeFilename = (filename) => {
    // Check if filename only contains alphanumeric characters, dots, hyphens, and underscores
    // and is not too long
    return filename.length <= 100 && /^[a-zA-Z0-9._-]+$/.test(filename);
};

// Helper function to sanitize filename only if needed
const sanitizeFilename = (filename) => {
    // If the filename is already safe, return it unchanged
    if (isSafeFilename(filename)) {
        return filename;
    }
    // Otherwise sanitize it
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
    const categories = [
        'photos', 
        'documents', 
        'invoices', 
        'incidentReports', 
        'correspondence', 
        'rentalAgreement', 
        'policeReport'
    ];
    
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
        const claim = await Claim.findById(claimId)
            .populate('status')
            .populate('rentingLocation')
            .populate('damageType');

        if (!claim) {
            logRequest(req, `Claim with ID ${claimId} not found`, { level: 'error' });
            return res.status(404).render('404', { message: 'Claim not found' });
        }

        const doc = new PDFDocument({ autoFirstPage: true, margin: 50 });
        const filename = `claim_${claimId}.pdf`;
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/pdf');

        doc.pipe(res);

        // Helper function to add a field to the PDF
        const addField = (label, value) => {
            let displayValue = value;
            if (value === undefined || value === null || value === '') {
                displayValue = 'Not Provided';
            } else if (typeof value === 'boolean') {
                displayValue = value ? 'Yes' : 'No';
            }
            doc.text(`${label}: ${displayValue}`, { continued: false });
            doc.moveDown(0.5);
        };

        // Helper function to add a section header
        const addSectionHeader = (title) => {
            doc.moveDown();
            doc.fontSize(16).text(title, { underline: true });
            doc.moveDown();
            doc.fontSize(12);
        };

        // Title Page
        doc.fontSize(24).text('Claim Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text(`Claim #${claim.claimNumber}`, { align: 'center' });
        doc.moveDown();
        doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Table of Contents
        doc.fontSize(14).text('Table of Contents', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        const sections = [
            'Claim Overview',
            'Customer Information',
            'Vehicle Information',
            'Accident Details',
            'Insurance Information',
            'Third Party Information',
            'Financial Information',
            'Notes and Comments',
            'Attached Documents'
        ];
        sections.forEach((section, index) => {
            doc.text(`${index + 1}. ${section}`);
            doc.moveDown(0.5);
        });

        // Claim Overview
        doc.addPage();
        addSectionHeader('1. Claim Overview');
        addField('Claim Number', claim.claimNumber);
        addField('MVA', claim.mva);
        addField('Status', claim.status ? claim.status.name : 'Not Set');
        addField('Date Created', new Date(claim.date).toLocaleDateString());
        addField('Claim Close Date', claim.claimCloseDate ? new Date(claim.claimCloseDate).toLocaleDateString() : 'Not Closed');
        addField('Description', claim.description);

        // Customer Information
        doc.addPage();
        addSectionHeader('2. Customer Information');
        addField('Customer Name', claim.customerName);
        addField('Customer Number', claim.customerNumber);
        addField('Customer Email', claim.customerEmail);
        addField('Customer Phone', claim.customerPhone);
        addField('Customer Address', claim.customerAddress);
        addField('Customer Drivers License', claim.customerDriversLicense);

        // Vehicle Information
        doc.addPage();
        addSectionHeader('3. Vehicle Information');
        addField('Car Make', claim.carMake);
        addField('Car Model', claim.carModel);
        addField('Car Year', claim.carYear);
        addField('Car Color', claim.carColor);
        addField('Car VIN', claim.carVIN);
        addField('Vehicle Odometer', claim.vehicleOdometer);
        addField('RA Number', claim.raNumber);
        addField('Renting Location', claim.rentingLocation ? claim.rentingLocation.name : 'Not Specified');

        // Accident Details
        doc.addPage();
        addSectionHeader('4. Accident Details');
        addField('Accident Date', claim.accidentDate ? new Date(claim.accidentDate).toLocaleDateString() : 'Not Specified');
        addField('Damage Type', claim.damageType ? claim.damageType.name : 'Not Specified');
        addField('Police Department', claim.policeDepartment);
        addField('Police Report Number', claim.policeReportNumber);
        addField('Is Renter At Fault', claim.isRenterAtFault);
        addField('Body Shop Name', claim.bodyShopName);
        addField('Description of Damage', claim.description);

        // Insurance Information
        doc.addPage();
        addSectionHeader('5. Insurance Information');
        addField('Insurance Carrier', claim.insuranceCarrier);
        addField('Insurance Agent', claim.insuranceAgent);
        addField('Insurance Phone Number', claim.insurancePhoneNumber);
        addField('Insurance Fax Number', claim.insuranceFaxNumber);
        addField('Insurance Address', claim.insuranceAddress);
        addField('Insurance Claim Number', claim.insuranceClaimNumber);
        addField('Renters Liability Insurance', claim.rentersLiabilityInsurance);
        addField('Loss Damage Waiver', claim.lossDamageWaiver);
        addField('LDW Accepted', claim.ldwAccepted);

        // Third Party Information
        doc.addPage();
        addSectionHeader('6. Third Party Information');
        addField('Third Party Name', claim.thirdPartyName);
        addField('Third Party Phone Number', claim.thirdPartyPhoneNumber);
        addField('Third Party Insurance Name', claim.thirdPartyInsuranceName);
        addField('Third Party Policy Number', claim.thirdPartyPolicyNumber);

        // Financial Information
        doc.addPage();
        addSectionHeader('7. Financial Information');
        addField('Billable', claim.billable);
        addField('Damages Total', claim.damagesTotal ? `$${claim.damagesTotal}` : 'Not Specified');
        if (claim.invoiceTotals && claim.invoiceTotals.length > 0) {
            doc.moveDown();
            doc.text('Invoice Totals:', { underline: true });
            claim.invoiceTotals.forEach(invoice => {
                doc.text(`- ${invoice.fileName}: $${invoice.total}`);
            });
        }

        // Notes and Comments
        doc.addPage();
        addSectionHeader('8. Notes and Comments');
        if (claim.notes && claim.notes.length > 0) {
            claim.notes.forEach((note, index) => {
                doc.text(`Note ${index + 1}:`);
                doc.text(`Date: ${new Date(note.createdAt).toLocaleString()}`);
                doc.text(`Type: ${note.type}`);
                doc.text(`Content: ${note.content}`);
                doc.moveDown();
            });
        } else {
            doc.text('No notes available');
        }

        // Attached Documents
        doc.addPage();
        addSectionHeader('9. Attached Documents');
        const files = claim.files || {};
        const fileCategories = [
            { title: 'Photos', files: files.photos || [] },
            { title: 'Documents', files: files.documents || [] },
            { title: 'Invoices', files: files.invoices || [] },
            { title: 'Police Reports', files: files.policeReports || [] },
            { title: 'Rental Agreements', files: files.rentalAgreements || [] }
        ];

        fileCategories.forEach(category => {
            if (category.files.length > 0) {
                doc.moveDown();
                doc.fontSize(16).text(category.title, { underline: true });
                doc.fontSize(12);
                
                category.files.forEach((file, index) => {
                    const filePath = path.join(__dirname, '../public/uploads', file);
                    try {
                        if (file.match(/\.(png|jpg|jpeg)$/i)) {
                            // Start a new page for each image
                            if (index > 0) {
                                doc.addPage();
                            }
                            
                            // Add image title
                            doc.fontSize(14).text(file, { align: 'center' });
                            doc.moveDown();
                            
                            // Add image with consistent sizing
                            doc.image(filePath, {
                                fit: [500, 600],
                                align: 'center'
                            });
                            
                            // Add page number for photos
                            doc.fontSize(10)
                                .text(
                                    `Photo ${index + 1} of ${category.files.length}`,
                                    { align: 'center' }
                                );

                            // Add a new page after the last photo in the category
                            if (index === category.files.length - 1) {
                                doc.addPage();
                            }
                        } else {
                            // For non-image files
                            doc.fontSize(12).text(`- ${file}`);
                            doc.moveDown(0.5);
                        }
                    } catch (error) {
                        doc.fontSize(12).text(`Error processing file: ${file}`);
                        logRequest(req, 'Error processing file:', { error, file });
                        doc.moveDown();
                    }
                });
            } else {
                doc.moveDown();
                doc.fontSize(14).text(`${category.title}: No files attached`);
                doc.fontSize(12);
            }
            doc.moveDown(2);
        });

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

// Route for rental agreement-only claim creation
router.post('/rental-agreement', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), async (req, res) => {
    logRequest(req, 'Rental agreement-only claim creation initiated');

    try {
        // Check if rental agreement file is provided
        if (!req.files || !req.files.rentalAgreement) {
            return res.status(400).json({ error: 'Rental agreement file is required' });
        }

        const rentalAgreementFile = req.files.rentalAgreement;
        const fileExtension = path.extname(rentalAgreementFile.name).toLowerCase();

        // Validate file type
        if (!['.pdf', '.doc', '.docx'].includes(fileExtension)) {
            return res.status(400).json({ error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.' });
        }

        // Get default status for new claims
        const defaultStatus = await Status.findOne({ name: 'Open' });
        if (!defaultStatus) {
            throw new Error('Default status not found');
        }

        // Generate unique filename
        const uniqueFilename = `RA_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExtension}`;
        const uploadPath = path.join(uploadsPath, uniqueFilename);

        // Save the file
        await rentalAgreementFile.mv(uploadPath);

        // Extract data from rental agreement using the existing parsing service
        const result = await processRentalAgreement(uploadPath);
        const extractedData = result.data;
        console.log('Extracted data:', extractedData);

        if (!extractedData) {
            // If extraction fails, remove the uploaded file
            await fs.unlink(uploadPath);
            throw new Error('Failed to extract data from rental agreement');
        }

        // Handle location
        let locationId = null;
        if (extractedData.pickupLocation) {
            try {
                const fullAddress = extractedData.pickupLocation;
                // Extract street address (first line before comma)
                const streetAddress = fullAddress.split(',')[0].trim().toUpperCase();
                
                console.log('Processing location:', { fullAddress, streetAddress });

                // Try to find existing location
                let location = await Location.findOne({
                    name: { $regex: new RegExp(`^${streetAddress}$`, 'i') }
                });

                if (location) {
                    console.log('Found existing location:', location._id);
                    locationId = location._id;
                } else {
                    // Create new location
                    location = new Location({
                        name: streetAddress,
                        address: fullAddress
                    });
                    await location.save();
                    console.log('Created new location:', location._id);
                    locationId = location._id;
                }
            } catch (locationError) {
                console.error('Error processing location:', locationError);
            }
        } else {
            console.warn('No pickup location found in extracted data');
        }

        // Create claim with location
        const claim = new Claim({
            status: defaultStatus._id,
            raNumber: extractedData.raNumber,
            customerName: extractedData.customerName,
            mva: extractedData.customerNumber,  // Map customerNumber to mva
            customerEmail: extractedData.customerEmail,
            customerAddress: extractedData.customerAddress,
            customerDriversLicense: extractedData.customerDriversLicense,
            carMake: extractedData.carMake,
            carModel: extractedData.carModel,
            carYear: extractedData.carYear,
            carColor: extractedData.carColor,
            carVIN: extractedData.carVIN,
            vehicleOdometer: extractedData.vehicleOdometer,
            pickupLocation: extractedData.pickupLocation,
            rentingLocation: locationId,  // Set the location ID
            lossDamageWaiver: extractedData.lossDamageWaiver,
            rentersLiabilityInsurance: extractedData.rentersLiabilityInsurance,
            createdBy: req.user._id,
            files: {
                rentalAgreement: [uniqueFilename]
            }
        });

        console.log('Saving claim with data:', claim);
        await claim.save();

        // Notify relevant parties about the new claim
        await notifyNewClaim(req.user.email, claim);

        // Log the successful creation
        logRequest(req, 'Rental agreement claim created successfully', { 
            claimId: claim._id,
            extractionConfidence: result.metadata.extractionConfidence,
            fieldsMatched: result.metadata.fieldsMatched
        });

        // Return the created claim with extraction metadata
        res.status(201).json({
            message: 'Claim created successfully',
            claim: claim,
            extractionMetadata: {
                confidence: result.metadata.extractionConfidence,
                fieldsMatched: result.metadata.fieldsMatched,
                totalFields: result.metadata.totalFields,
                missingFields: result.metadata.requiredFieldsMissing,
                errors: result.metadata.errors
            }
        });

    } catch (error) {
        logRequest(req, 'Error creating rental agreement claim:', { error });
        res.status(500).json({ error: error.message || 'Error creating claim' });
    }
});

// Route to search for claims, accessible by admin, manager, and employee
router.get('/search', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), async (req, res) => {
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
        if (damageType) {
            if (Array.isArray(damageType)) {
                filter.damageType = { $in: damageType };
            } else {
                filter.damageType = damageType;
            }
        }
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
        console.log('Available statuses:', allStatuses.map(s => ({ id: s._id, name: s.name })));

        // Get pagination parameters and fetch claims
        const page = parseInt(req.query.page) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage) || 10;
        const skip = (page - 1) * resultsPerPage;

        const totalClaims = await Claim.countDocuments(filter);
        const totalPages = Math.ceil(totalClaims / resultsPerPage);

        const claims = await Claim.find(filter)
            .populate('status')
            .populate('damageType')
            .skip(skip)
            .limit(resultsPerPage)
            .lean();

        // Process claims to get damage type names
        const processedClaims = claims.map(claim => ({
            ...claim,
            damageType: claim.damageType ? 
                (Array.isArray(claim.damageType) ? 
                    claim.damageType.map(dt => dt.name || dt).join(', ') : 
                    claim.damageType.name || claim.damageType) : ''
        }));

        // Build query string
        const queryString = Object.entries(req.query)
            .filter(([key]) => !['page', 'resultsPerPage'].includes(key))
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');

        // Check if this is an AJAX request
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({
                claims: processedClaims,
                page,
                totalPages,
                totalClaims,
                resultsPerPage,
                queryString: queryString ? `&${queryString}` : ''
            });
        }

        // Regular HTML response
        res.render('claims_search', {
            claims: processedClaims,
            filter,
            damageTypes,
            statuses,
            locations,
            resultsPerPage,
            page,
            totalPages,
            totalClaims,
            queryString: queryString ? `&${queryString}` : ''
        });
    } catch (err) {
        console.error('Search route error:', err);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({ error: err.message });
        }
        res.status(500).render('500', { message: 'Error processing search' });
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
        // Log the incoming request data (excluding sensitive info)
        logger.info('Creating new claim with data:', {
            ...req.body,
            // Exclude any sensitive fields if present
            customerDriversLicense: req.body.customerDriversLicense ? '[REDACTED]' : undefined,
            // Add other sensitive fields to redact as needed
        });

        // Get the default 'Open' status
        const defaultStatus = await Status.findOne({ name: 'Open' });
        if (!defaultStatus) {
            throw new Error('Default status "Open" not found. Please ensure statuses are properly configured.');
        }

        // Initialize files object for the claim
        const files = initializeFileCategories();

        // Process uploaded photos if any
        if (req.files && req.files.photos) {
            const uploadedPhotos = Array.isArray(req.files.photos) ? req.files.photos : [req.files.photos];
            
            for (const photo of uploadedPhotos) {
                // Validate file
                const errors = validateFile(photo, 'photos');
                if (errors.length > 0) {
                    throw new Error(`Invalid photo upload: ${errors.join(', ')}`);
                }

                // Generate unique filename
                const ext = path.extname(photo.name);
                const uniqueFilename = `photo_${Date.now()}_${Math.round(Math.random() * 1E9)}${ext}`;
                const uploadPath = path.join(uploadsPath, uniqueFilename);

                // Save the file
                await photo.mv(uploadPath);
                logger.info(`Photo uploaded successfully: ${uniqueFilename}`);
                
                // Add to photos array
                files.photos.push(uniqueFilename);
            }
        }

        // Create new claim with default status and files
        const newClaim = new Claim({
            ...req.body,
            status: defaultStatus._id, // Set the default status
            createdBy: req.user._id,
            files: files // Include the files object with photos if any were uploaded
        });
        
        // Save the claim (claim number will be generated automatically)
        try {
            await newClaim.save();
            logger.info('New claim created successfully:', { 
                claimId: newClaim._id,
                claimNumber: newClaim.claimNumber,
                filesUploaded: files.photos.length > 0 ? { photoCount: files.photos.length } : 'none'
            });
        } catch (saveError) {
            logger.error('Error saving new claim:', {
                error: saveError.message,
                stack: saveError.stack,
                validationErrors: saveError.errors
            });
            throw saveError; // Re-throw to be caught by outer try-catch
        }
        
        // Send notification
        try {
            await notifyNewClaim(req.user.email, newClaim);
        } catch (notifyError) {
            // Log notification error but don't fail the request
            logger.error('Error sending claim notification:', {
                error: notifyError.message,
                claimId: newClaim._id
            });
        }

        // If this is an API request, send JSON response
        if (req.xhr || req.headers.accept.includes('application/json')) {
            res.status(201).json({
                success: true,
                claim: {
                    id: newClaim._id,
                    claimNumber: newClaim.claimNumber
                }
            });
        } else {
            // Otherwise redirect to the claim view page
            res.redirect(`/claims/${newClaim._id}`);
        }
    } catch (error) {
        logger.error('Error in claim creation:', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });

        // If this is an API request, send JSON error response
        if (req.xhr || req.headers.accept.includes('application/json')) {
            res.status(500).json({
                success: false,
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error creating claim',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        } else {
            // For regular form submissions, render error page
            res.status(500).render('500', {
                message: 'Error creating claim',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
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
        delete updateData.deletedNotes;

        // Handle file uploads
        const fileCategories = ['photos', 'documents', 'invoices', 'incidentReports', 'correspondence', 'rentalAgreement', 'policeReport'];
        const fileErrors = [];
        const files = claim.files || {};

        // Process each file category
        for (const category of fileCategories) {
            if (req.files && req.files[category]) {
                const uploadedFiles = Array.isArray(req.files[category]) ? req.files[category] : [req.files[category]];
                
                // Initialize category array if it doesn't exist
                if (!files[category]) {
                    files[category] = [];
                }

                // Process each uploaded file
                for (const file of uploadedFiles) {
                    // Validate file
                    const errors = validateFile(file, category);
                    if (errors.length > 0) {
                        fileErrors.push(...errors);
                        continue;
                    }

                    // Get the original filename and extension
                    const ext = path.extname(file.name);
                    const originalName = path.basename(file.name, ext);
                    
                    // If original name is safe, use it, otherwise sanitize it
                    let filename;
                    if (isSafeFilename(file.name)) {
                        filename = file.name;
                    } else {
                        // If we need to sanitize, add uniqueness to avoid collisions
                        const sanitizedName = sanitizeFilename(originalName);
                        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                        filename = `${category}-${uniqueSuffix}${ext}`;
                    }
                    
                    const uploadPath = path.join(uploadsPath, filename);

                    try {
                        // Check if file already exists - using fs.promises.access and try/catch
                        try {
                            await fs.promises.access(uploadPath, fs.constants.F_OK);
                            // If file exists and has safe name, add uniqueness
                            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                            filename = `${path.basename(filename, ext)}-${uniqueSuffix}${ext}`;
                        } catch (err) {
                            // File doesn't exist, which is fine
                        }
                        
                        // Move file to uploads directory
                        await file.mv(path.join(uploadsPath, filename));
                        files[category].push(filename);
                        logger.info(`File uploaded successfully: ${filename}`);
                    } catch (error) {
                        logger.error('Error uploading file:', error);
                        fileErrors.push(`Error uploading ${file.name}: ${error.message}`);
                    }
                }
            }
        }

        // Handle file removals
        if (req.body.removedFiles) {
            try {
                const removedFiles = JSON.parse(req.body.removedFiles);
                for (const removedFile of removedFiles) {
                    const { type, name } = typeof removedFile === 'string' ? JSON.parse(removedFile) : removedFile;
                    if (files[type]) {
                        const index = files[type].indexOf(name);
                        if (index !== -1) {
                            files[type].splice(index, 1);
                            // Remove file from disk
                            const filePath = path.join(uploadsPath, name);
                            try {
                                await fs.promises.access(filePath, fs.constants.F_OK);
                                await fs.promises.unlink(filePath);
                            } catch (err) {
                                // File doesn't exist, no need to delete
                                logger.warn(`Attempted to delete non-existent file: ${filePath}`);
                            }
                        }
                    }
                }
            } catch (error) {
                logger.error('Error processing removed files:', error);
            }
        }

        // Update the files in updateData
        updateData.files = files;

        // If there are file errors, render the form with errors
        if (fileErrors.length > 0) {
            const statuses = await Status.find().sort({ name: 1 });
            const locations = await Location.find().sort({ name: 1 });
            const damageTypes = await DamageType.find().sort({ name: 1 });
            return res.render('claims_edit', {
                claim: { ...claim.toObject(), ...updateData },
                statuses,
                locations,
                damageTypes,
                fileErrors
            });
        }

        // Update the claim
        const updatedClaim = await Claim.findByIdAndUpdate(
            claimId,
            updateData,
            { new: true }
        );

        logger.info('Claim updated:', updatedClaim);
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
        const claim = await Claim.findById(claimId)
            .populate('rentingLocation')
            .populate('status')
            .exec();
            
        if (!claim) {
            logRequest(req, `Claim with ID ${claimId} not found`, { level: 'error' });
            return res.status(404).render('404', { message: 'Claim not found' });
        }

        // Add debug logging for rentingLocation
        console.log('Claim rentingLocation:', {
            raw: claim.rentingLocation,
            populated: claim.populated('rentingLocation'),
            name: claim.rentingLocation?.name
        });

        // Handle damageType population manually
        if (claim.damageType) {
            if (Array.isArray(claim.damageType)) {
                const damageTypes = await DamageType.find({
                    _id: { $in: claim.damageType }
                });
                claim.damageType = damageTypes;
            } else {
                const damageType = await DamageType.findById(claim.damageType);
                claim.damageType = damageType ? [damageType] : [];
            }
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

// Migration route to fix damageType references
router.post('/migrate-damage-types', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    try {
        const claims = await Claim.find({
            damageType: { $type: 'string' }
        });

        for (const claim of claims) {
            if (typeof claim.damageType === 'string' || (Array.isArray(claim.damageType) && claim.damageType.every(dt => typeof dt === 'string'))) {
                const damageTypeIds = Array.isArray(claim.damageType) ? claim.damageType : [claim.damageType];
                claim.damageType = damageTypeIds;
                await claim.save();
            }
        }

        res.json({ message: 'Migration completed successfully' });
    } catch (error) {
        logger.error('Error migrating damage types:', error);
        res.status(500).json({ error: 'Error during migration' });
    }
});

// Migration route to fix rentingLocation references
router.post('/migrate-renting-locations', ensureAuthenticated, ensureRoles(['admin']), async (req, res) => {
    try {
        const claims = await Claim.find({
            rentingLocation: { $type: 'string' }
        });

        for (const claim of claims) {
            if (typeof claim.rentingLocation === 'string') {
                // Find the location by name
                const location = await Location.findOne({ 
                    name: { $regex: new RegExp(`^${claim.rentingLocation}$`, 'i') }
                });
                
                if (location) {
                    claim.rentingLocation = location._id;
                    await claim.save();
                    logger.info(`Updated rentingLocation for claim ${claim._id}`);
                } else {
                    logger.warn(`Could not find location for name: ${claim.rentingLocation} in claim ${claim._id}`);
                }
            }
        }

        res.json({ message: 'Migration completed successfully' });
    } catch (error) {
        logger.error('Error migrating renting locations:', error);
        res.status(500).json({ error: 'Error during migration' });
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

// Route to rename a file in a claim
router.put('/:id/rename-file', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), async (req, res) => {
    const claimId = req.params.id;
    const { category, oldName, newName } = req.body;

    try {
        // Find the claim
        const claim = await Claim.findById(claimId);
        if (!claim) {
            logger.error(`Claim not found with ID: ${claimId}`);
            return res.status(404).json({ success: false, message: 'Claim not found' });
        }

        // Validate that the file exists in the specified category
        if (!claim.files || !claim.files[category] || !claim.files[category].includes(oldName)) {
            logger.error(`File ${oldName} not found in category ${category}`);
            return res.status(404).json({ success: false, message: 'File not found in claim' });
        }

        // Validate new filename
        const ext = path.extname(oldName);
        const newNameWithExt = newName.endsWith(ext) ? newName : newName + ext;
        
        // Only sanitize if the new name isn't safe
        const finalNewName = isSafeFilename(newNameWithExt) ? newNameWithExt : sanitizeFilename(newNameWithExt);

        // Validate file with new name
        const dummyFile = { name: finalNewName };
        const validationErrors = validateFile(dummyFile, category);
        if (validationErrors.length > 0) {
            return res.status(400).json({ success: false, errors: validationErrors });
        }

        // Rename file on disk
        const oldPath = path.join(uploadsPath, oldName);
        const newPath = path.join(uploadsPath, finalNewName);

        if (!fs.access(oldPath)) {
            logger.error(`File ${oldPath} not found on disk`);
            return res.status(404).json({ success: false, message: 'File not found on disk' });
        }

        if (fs.access(newPath)) {
            logger.error(`File ${newPath} already exists`);
            return res.status(400).json({ success: false, message: 'A file with this name already exists' });
        }

        // Perform the rename operation
        await fs.rename(oldPath, newPath);

        // Update the filename in the claim document
        const fileIndex = claim.files[category].indexOf(oldName);
        claim.files[category][fileIndex] = finalNewName;
        await claim.save();

        logger.info(`File renamed successfully from ${oldName} to ${finalNewName}`);
        res.json({ 
            success: true, 
            message: 'File renamed successfully',
            oldName: oldName,
            newName: finalNewName
        });

    } catch (error) {
        logger.error('Error renaming file:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error renaming file',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router; // Export the router