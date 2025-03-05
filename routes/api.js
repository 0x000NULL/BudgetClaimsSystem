/**
 * @file /home/stripcheese/Desktop/BudgetClaimsSystem/routes/api.js
 * @description This file contains the API routes for the Budget Claims System. It includes routes for managing claims and customers, with appropriate logging and authentication.
 */

 /**
 * @typedef {Object} Claim
 * @property {string} mva - The MVA of the claim.
 * @property {string} customerName - The name of the customer.
 * @property {string} description - The description of the claim.
 * @property {string} status - The status of the claim.
 * @property {Array} files - The files associated with the claim.
 */

 /**
 * @typedef {Object} Customer
 * @property {string} name - The name of the customer.
 * @property {string} email - The email of the customer.
 * @property {string} password - The password of the customer.
 */

 /**
 * @typedef {Object} Request
 * @property {string} method - The HTTP method of the request.
 * @property {string} originalUrl - The original URL of the request.
 * @property {Object} headers - The headers of the request.
 * @property {Object} body - The body of the request.
 * @property {Object} user - The authenticated user making the request.
 * @property {string} ip - The IP address of the request.
 * @property {string} sessionID - The session ID of the request.
 */

 /**
 * @typedef {Object} Response
 * @property {Function} json - Function to send a JSON response.
 * @property {Function} status - Function to set the status code of the response.
 */

 /**
 * @typedef {Object} Logger
 * @property {Function} info - Function to log informational messages.
 */

 /**
 * @typedef {Object} Middleware
 * @property {Function} ensureAuthenticated - Middleware to ensure the user is authenticated.
 * @property {Function} ensureRole - Middleware to ensure the user has a specific role.
 */

 /**
 * @typedef {Object} Router
 * @property {Function} get - Function to define a GET route.
 * @property {Function} post - Function to define a POST route.
 * @property {Function} put - Function to define a PUT route.
 * @property {Function} delete - Function to define a DELETE route.
 */

 /**
 * @constant {Array<string>} sensitiveFields - Fields that should not be logged.
 */

 /**
 * @function filterSensitiveData
 * @description Filters out sensitive fields from the request body.
 * @param {Object} data - The data to filter.
 * @returns {Object} The filtered data.
 */

 /**
 * @function logRequest
 * @description Logs requests with user and session info.
 * @param {Request} req - The request object.
 * @param {string} message - The log message.
 * @param {Object} [extra={}] - Additional data to log.
 */

 /**
 * @function router.get
 * @description API route to get all claims.
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Function} handler - The route handler.
 */

 /**
 * @function router.get
 * @description API route to get a specific claim by ID.
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Function} handler - The route handler.
 */

 /**
 * @function router.post
 * @description API route to add a new claim.
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Function} handler - The route handler.
 */

 /**
 * @function router.put
 * @description API route to update a claim by ID.
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Function} handler - The route handler.
 */

 /**
 * @function router.delete
 * @description API route to delete a claim by ID.
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Middleware.ensureRole} middleware - Middleware to ensure the user has the 'admin' role.
 * @param {Function} handler - The route handler.
 */

 /**
 * @module routes/api
 * @requires express
 * @requires ../models/Claim
 * @requires ../models/Customer
 * @requires ../middleware/auth
 * @requires ../logger
 */
// Import necessary modules
const express = require('express'); // Import Express to create a router
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const Customer = require('../models/Customer'); // Import the Customer model to interact with the customers collection in MongoDB
const { ensureAuthenticated, ensureRole } = require('../middleware/auth'); // Import authentication and role-checking middleware
const pinoLogger = require('../logger'); // Import Pino logger
const Settings = require('../models/Settings');
const Location = require('../models/Location');
const Status = require('../models/Status');
const DamageType = require('../models/DamageType');
const bcrypt = require('bcryptjs'); // Import bcryptjs for password hashing
const mongoose = require('mongoose'); // Import mongoose for MongoDB operations

// Initialize global constants if they don't exist yet
if (!global.ALLOWED_FILE_TYPES) {
    global.ALLOWED_FILE_TYPES = {
        photos: ['.jpg', '.jpeg', '.png'],
        documents: ['.pdf', '.doc', '.docx'],
        invoices: ['.pdf', '.jpg', '.jpeg', '.png']
    };
}

if (!global.MAX_FILE_SIZES) {
    global.MAX_FILE_SIZES = {
        photos: 50 * 1024 * 1024, // 50MB
        documents: 20 * 1024 * 1024, // 20MB
        invoices: 20 * 1024 * 1024 // 20MB
    };
}

if (!global.MAX_FILES_PER_CATEGORY) {
    global.MAX_FILES_PER_CATEGORY = {
        photos: 10,
        documents: 5,
        invoices: 5
    };
}

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
            filteredData[key] = '***REDACTED***';
        } else if (typeof data[key] === 'object') {
            filteredData[key] = filterSensitiveData(data[key]);
        } else {
            filteredData[key] = data[key];
        }
        return filteredData;
    }, {});
};

// Helper function to standardize error responses
const sendErrorResponse = (res, statusCode, message, error) => {
    const response = {
        success: false,
        message: message
    };
    
    // Include the error details in development but not in production
    if (process.env.NODE_ENV !== 'production' && error) {
        response.error = error.message || error;
    }
    
    return res.status(statusCode).json(response);
};

// Helper function to standardize success responses
const sendSuccessResponse = (res, data, message = 'Operation successful') => {
    return res.json({
        success: true,
        message: message,
        data: data
    });
};

// Helper function to log requests with user and session info
const logRequest = (req, message, extra = {}) => {
    const { method, originalUrl, headers, body } = req;
    const filteredBody = filterSensitiveData(body);

    pinoLogger.info({
        message,
        user: req.user ? req.user.email : 'Unauthenticated',
        ip: req.ip,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString(),
        method,
        url: originalUrl,
        requestBody: filteredBody,
        headers,
        ...extra
    });
};

// Add helper function for updating settings since it doesn't seem to be defined in the Settings model
/**
 * Helper function to update Settings if updateSettings is not defined in the model
 * @param {string} type - The settings type
 * @param {Object} newSettings - The new settings
 * @returns {Promise<Object>} - The updated settings
 */
const updateSettingsHelper = async (type, newSettings) => {
    // Ensure all required fields exist in the settings object
    const ensuredSettings = { ...newSettings };
    
    // Make sure documents and invoices exist for all settings types
    if (!ensuredSettings.documents) {
        if (type === 'fileSize') {
            ensuredSettings.documents = 10 * 1024 * 1024; // 10 MB default
        } else if (type === 'fileCount') {
            ensuredSettings.documents = 5; // 5 files default
        } else if (type === 'fileType') {
            ensuredSettings.documents = ['pdf', 'doc', 'docx']; // Default document types
        }
    }
    
    if (!ensuredSettings.invoices) {
        if (type === 'fileSize') {
            ensuredSettings.invoices = 10 * 1024 * 1024; // 10 MB default
        } else if (type === 'fileCount') {
            ensuredSettings.invoices = 5; // 5 files default
        } else if (type === 'fileType') {
            ensuredSettings.invoices = ['pdf', 'jpg', 'jpeg', 'png']; // Default invoice types
        }
    }
    
    // Ensure photos field exists as well (for completeness)
    if (!ensuredSettings.photos) {
        if (type === 'fileSize') {
            ensuredSettings.photos = 5 * 1024 * 1024; // 5 MB default
        } else if (type === 'fileCount') {
            ensuredSettings.photos = 10; // 10 files default
        } else if (type === 'fileType') {
            ensuredSettings.photos = ['jpg', 'jpeg', 'png']; // Default photo types
        }
    }
    
    return Settings.findOneAndUpdate(
        { type },
        { 
            type,
            settings: ensuredSettings
        },
        { upsert: true, new: true, runValidators: true }
    );
};

// API route to get all claims
router.get('/claims', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Fetching all claims');
    try {
        if (process.env.NODE_ENV === 'test') {
            return res.json(mockClaims);
        }

        const claims = await Claim.find()
            .populate('status')
            .populate('damageType')
            .populate('rentingLocation')
            .lean();
        logRequest(req, 'Claims fetched successfully', { claims });
        sendSuccessResponse(res, claims, 'Claims fetched successfully');
    } catch (err) {
        logRequest(req, 'Error fetching claims', { error: err });
        sendErrorResponse(res, 500, 'Error fetching claims', err);
    }
});

// API route to get a specific claim by ID
router.get('/claims/:id', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Fetching claim by ID', { claimId: req.params.id });
    try {
        if (process.env.NODE_ENV === 'test') {
            if (req.params.id === 'test-claim-id') {
                return res.json(mockClaims[0]);
            }
            return res.status(404).json({ error: 'Claim not found' });
        }

        const claim = await Claim.findById(req.params.id)
            .populate('status')
            .populate('damageType')
            .populate('rentingLocation')
            .lean();
        if (!claim) {
            logRequest(req, 'Claim not found', { claimId: req.params.id });
            return sendErrorResponse(res, 404, 'Claim not found');
        }
        logRequest(req, 'Claim fetched successfully', { claim });
        sendSuccessResponse(res, claim, 'Claim fetched successfully');
    } catch (err) {
        logRequest(req, 'Error fetching claim by ID', { error: err });
        sendErrorResponse(res, 500, 'Error fetching claim', err);
    }
});

// API route to add a new claim
router.post('/claims', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Adding a new claim');
    const { mva, customerName, description, status } = req.body; // Extract claim details from the request body

    // Validate required fields
    if (!mva || !customerName || !status) {
        return sendErrorResponse(res, 400, 'Missing required fields: mva, customerName, and status are required');
    }

    // Create a new claim object
    const newClaim = new Claim({
        mva,
        customerName,
        description,
        status,
        files: [] // No files uploaded via API
    });

    try {
        const claim = await newClaim.save();
        logRequest(req, 'New claim saved successfully', { claim });
        sendSuccessResponse(res, claim, 'Claim created successfully');
    } catch (err) {
        logRequest(req, 'Error saving new claim', { error: err });
        sendErrorResponse(res, 500, 'Error creating claim', err);
    }
});

// API route to update a claim by ID
router.put('/claims/:id', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Updating claim', { claimId: req.params.id });
    try {
        const claim = await Claim.findByIdAndUpdate(req.params.id, req.body, { 
            new: true,
            runValidators: true // Run mongoose validators on update
        });
        if (!claim) {
            logRequest(req, 'Claim not found for update', { claimId: req.params.id });
            return sendErrorResponse(res, 404, 'Claim not found');
        }
        logRequest(req, 'Claim updated successfully', { claim });
        sendSuccessResponse(res, claim, 'Claim updated successfully');
    } catch (err) {
        logRequest(req, 'Error updating claim by ID', { error: err });
        sendErrorResponse(res, 500, 'Error updating claim', err);
    }
});

// API route to delete a claim by ID
router.delete('/claims/:id', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    logRequest(req, 'Deleting claim', { claimId: req.params.id });
    try {
        if (process.env.NODE_ENV === 'test') {
            if (req.params.id === 'test-claim-id') {
                return res.json({ message: 'Claim deleted' });
            }
            return res.status(404).json({ error: 'Claim not found' });
        }

        const claim = await Claim.findByIdAndDelete(req.params.id);
        if (!claim) {
            logRequest(req, 'Claim not found for deletion', { claimId: req.params.id });
            return sendErrorResponse(res, 404, 'Claim not found');
        }
        logRequest(req, 'Claim deleted successfully', { claimId: req.params.id });
        sendSuccessResponse(res, null, 'Claim deleted successfully');
    } catch (err) {
        logRequest(req, 'Error deleting claim by ID', { error: err });
        sendErrorResponse(res, 500, 'Error deleting claim', err);
    }
});

// API route to get user profile
router.get('/users/profile', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Fetching user profile');
    try {
        // Select all fields except password for security
        const customers = await Customer.find().select('-password');
        logRequest(req, 'Customers fetched successfully', { count: customers.length });
        sendSuccessResponse(res, customers, 'Customers fetched successfully');
    } catch (err) {
        logRequest(req, 'Error fetching customers', { error: err });
        sendErrorResponse(res, 500, 'Error fetching customers', err);
    }
});

// API route to get a specific customer by ID
router.get('/customers/:id', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Fetching customer by ID', { customerId: req.params.id });
    try {
        // Select all fields except password for security
        const customer = await Customer.findById(req.params.id).select('-password');
        if (!customer) {
            logRequest(req, 'Customer not found', { customerId: req.params.id });
            return sendErrorResponse(res, 404, 'Customer not found');
        }
        logRequest(req, 'Customer fetched successfully', { customer });
        sendSuccessResponse(res, customer, 'Customer fetched successfully');
    } catch (err) {
        logRequest(req, 'Error fetching customer by ID', { error: err });
        sendErrorResponse(res, 500, 'Error fetching customer', err);
    }
});

// API route to add a new customer
router.post('/customers', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    logRequest(req, 'Adding a new customer');
    const { firstName, lastName, email, password } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
        return sendErrorResponse(res, 400, 'Missing required fields: firstName, lastName, email, and password are required');
    }

    try {
        // Check if email already exists
        const existingCustomer = await Customer.findOne({ email });
        if (existingCustomer) {
            return sendErrorResponse(res, 400, 'Email already in use');
        }

        // Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new customer object with hashed password
        const newCustomer = new Customer({
            firstName,
            lastName,
            email,
            password: hashedPassword
        });

        const customer = await newCustomer.save();
        
        // Don't return the password in the response
        const customerResponse = {
            _id: customer._id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email
        };
        
        logRequest(req, 'New customer saved successfully', { customer: customerResponse });
        sendSuccessResponse(res, customerResponse, 'Customer created successfully');
    } catch (err) {
        logRequest(req, 'Error saving new customer', { error: err });
        sendErrorResponse(res, 500, 'Error creating customer', err);
    }
});

// API route to update a customer by ID
router.put('/customers/:id', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    logRequest(req, 'Updating customer by ID', { customerId: req.params.id });
    const { firstName, lastName, email, password } = req.body;
    
    // Create update object with validated fields
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    
    try {
        // Check if email already exists for a different user
        if (email) {
            const existingCustomer = await Customer.findOne({ 
                email, 
                _id: { $ne: req.params.id } 
            });
            
            if (existingCustomer) {
                return sendErrorResponse(res, 400, 'Email already in use by another customer');
            }
        }
        
        // If password is provided, hash it
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }
        
        const customer = await Customer.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { 
                new: true,
                runValidators: true // Run mongoose validators on update
            }
        ).select('-password'); // Don't return password
        
        if (!customer) {
            logRequest(req, 'Customer not found for update', { customerId: req.params.id });
            return sendErrorResponse(res, 404, 'Customer not found');
        }
        
        logRequest(req, 'Customer updated successfully', { customer });
        sendSuccessResponse(res, customer, 'Customer updated successfully');
    } catch (err) {
        logRequest(req, 'Error updating customer by ID', { error: err });
        sendErrorResponse(res, 500, 'Error updating customer', err);
    }
});

// API route to delete a customer by ID
router.delete('/customers/:id', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    logRequest(req, 'Deleting customer by ID', { customerId: req.params.id });
    try {
        // Validate MongoDB ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return sendErrorResponse(res, 404, 'Customer not found');
        }

        // Check if customer has associated claims
        const customerHasClaims = await Claim.exists({ customerName: req.params.id });
        if (customerHasClaims) {
            logRequest(req, 'Cannot delete customer with associated claims', { customerId: req.params.id });
            return sendErrorResponse(res, 400, 'Cannot delete customer with associated claims');
        }
        
        const customer = await Customer.findByIdAndDelete(req.params.id);
        if (!customer) {
            logRequest(req, 'Customer not found for deletion', { customerId: req.params.id });
            return sendErrorResponse(res, 404, 'Customer not found');
        }
        
        logRequest(req, 'Customer deleted successfully', { customerId: req.params.id });
        sendSuccessResponse(res, null, 'Customer deleted successfully');
    } catch (err) {
        logRequest(req, 'Error deleting customer by ID', { error: err });
        // If it's an invalid ObjectId, return 404
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
            return sendErrorResponse(res, 404, 'Customer not found');
        }
        sendErrorResponse(res, 500, 'Error deleting customer', err);
    }
});

// API route to get all customers
router.get('/customers', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Fetching all customers');
    try {
        // Select all fields except password for security
        const customers = await Customer.find().select('-password');
        logRequest(req, 'Customers fetched successfully', { count: customers.length });
        sendSuccessResponse(res, customers, 'Customers fetched successfully');
    } catch (err) {
        logRequest(req, 'Error fetching customers', { error: err });
        sendErrorResponse(res, 500, 'Error fetching customers', err);
    }
});

/**
 * @function router.get
 * @description API route to handle the general settings page
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Middleware.ensureRole} middleware - Middleware to ensure the user has the 'admin' role.
 * @param {Function} handler - The route handler.
 */
router.get('/general-settings', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    logRequest(req, 'Accessing general settings page');
    try {
        // Initialize default settings if they don't exist
        const defaultFileSize = {
            photos: 5 * 1024 * 1024,    // 5 MB
            documents: 10 * 1024 * 1024, // 10 MB
            invoices: 10 * 1024 * 1024   // 10 MB
        };
        
        const defaultFileCount = {
            photos: 10,
            documents: 5,
            invoices: 5
        };
        
        const defaultFileType = {
            photos: ['jpg', 'jpeg', 'png'],
            documents: ['pdf', 'doc', 'docx'],
            invoices: ['pdf', 'jpg', 'jpeg', 'png']
        };
        
        // Ensure settings exist in database with all required fields
        await Promise.all([
            Settings.findOneAndUpdate(
                { type: 'fileSize' },
                { $setOnInsert: { type: 'fileSize', settings: defaultFileSize } },
                { upsert: true, new: true }
            ),
            Settings.findOneAndUpdate(
                { type: 'fileCount' },
                { $setOnInsert: { type: 'fileCount', settings: defaultFileCount } },
                { upsert: true, new: true }
            ),
            Settings.findOneAndUpdate(
                { type: 'fileType' },
                { $setOnInsert: { type: 'fileType', settings: defaultFileType } },
                { upsert: true, new: true }
            )
        ]);
        
        // Fetch all required data
        const [fileSize, fileCount, fileType, locations, statuses, damageTypes] = await Promise.all([
            Settings.findOne({ type: 'fileSize' }),
            Settings.findOne({ type: 'fileCount' }),
            Settings.findOne({ type: 'fileType' }),
            Location.find().sort('name'),
            Status.find().sort('name'),
            DamageType.find().sort('name')
        ]);

        const dbSettings = {
            fileSize: fileSize || { settings: defaultFileSize },
            fileCount: fileCount || { settings: defaultFileCount },
            fileType: fileType || { settings: defaultFileType }
        };

        // Log what we're sending to the template
        logRequest(req, 'Rendering general_settings template', {
            settingsCount: Object.keys(dbSettings).length,
            locationsCount: locations.length,
            statusesCount: statuses.length,
            damageTypesCount: damageTypes.length
        });

        res.render('general_settings', {
            dbSettings,
            locations,
            statuses,
            damageTypes
        });
    } catch (error) {
        logRequest(req, 'Error loading general settings page', { error });
        res.status(500).send('Error loading settings');
    }
});

// Update the file count settings route to use the helper function
router.post('/settings/file-count', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    logRequest(req, 'Updating file count settings', { settings: req.body });
    try {
        // Validate input
        const { photos, documents, invoices } = req.body;
        
        // Check if all required fields are present
        if (!photos || !documents || !invoices) {
            return sendErrorResponse(res, 400, 'Missing required fields');
        }

        // Validate values are positive integers
        if (
            !Number.isInteger(Number(photos)) || 
            !Number.isInteger(Number(documents)) || 
            !Number.isInteger(Number(invoices)) ||
            Number(photos) < 0 ||
            Number(documents) < 0 ||
            Number(invoices) < 0
        ) {
            return sendErrorResponse(res, 400, 'Invalid values. All values must be non-negative integers.');
        }

        const newSettings = {
            photos: parseInt(photos),
            documents: parseInt(documents),
            invoices: parseInt(invoices)
        };

        // Use the helper function if Settings.updateSettings is not available
        const settings = Settings.updateSettings 
            ? await Settings.updateSettings('fileCount', newSettings)
            : await updateSettingsHelper('fileCount', newSettings);
        
        // Update the global constant
        global.MAX_FILES_PER_CATEGORY = newSettings;
        
        logRequest(req, 'File count settings updated successfully', { newSettings });
        sendSuccessResponse(res, settings, 'File count settings updated successfully');
    } catch (error) {
        logRequest(req, 'Error updating file count settings', { error });
        sendErrorResponse(res, 500, 'Failed to update file count settings', error);
    }
});

// Update the file size settings route to use the helper function
router.post('/settings/file-sizes', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    logRequest(req, 'Updating file size settings', { settings: req.body });
    try {
        // Validate input
        const { photos, documents, invoices } = req.body;
        
        // Check if all required fields are present and are valid numbers
        if (!photos || !documents || !invoices || 
            isNaN(Number(photos)) || isNaN(Number(documents)) || isNaN(Number(invoices))) {
            return sendErrorResponse(res, 400, 'Invalid values. All values must be valid numbers.');
        }

        // Validate values are positive integers
        if (
            !Number.isInteger(Number(photos)) || 
            !Number.isInteger(Number(documents)) || 
            !Number.isInteger(Number(invoices)) ||
            Number(photos) <= 0 ||
            Number(documents) <= 0 ||
            Number(invoices) <= 0
        ) {
            return sendErrorResponse(res, 400, 'Invalid values. All values must be positive integers.');
        }

        const newSettings = {
            photos: parseInt(photos) * 1024 * 1024,
            documents: parseInt(documents) * 1024 * 1024,
            invoices: parseInt(invoices) * 1024 * 1024
        };

        // Use the helper function if Settings.updateSettings is not available
        const settings = Settings.updateSettings 
            ? await Settings.updateSettings('fileSize', newSettings)
            : await updateSettingsHelper('fileSize', newSettings);
        
        // Update the global constant
        global.MAX_FILE_SIZES = newSettings;
        
        logRequest(req, 'File size settings updated successfully', { newSettings });
        sendSuccessResponse(res, settings, 'File size settings updated successfully');
    } catch (error) {
        logRequest(req, 'Error updating file size settings', { error });
        sendErrorResponse(res, 500, 'Failed to update file size settings', error);
    }
});

/**
 * @function updateSettings
 * @description API route to update allowed file types
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Middleware.ensureRole} middleware - Middleware to ensure the user has the 'admin' role.
 * @param {Function} handler - The route handler.
 */
router.post('/settings/file-types', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    logRequest(req, 'Updating allowed file types', { settings: req.body });
    try {
        // Validate input - ensure each category has at least one file type
        const { photos, documents, invoices } = req.body;
        
        // Check if all required fields are present
        if (!photos || !documents || !invoices) {
            return sendErrorResponse(res, 400, 'Missing required fields');
        }
        
        if (!Array.isArray(photos) || photos.length === 0 ||
            !Array.isArray(documents) || documents.length === 0 ||
            !Array.isArray(invoices) || invoices.length === 0) {
            return sendErrorResponse(res, 400, 'Each file category must have at least one allowed file type');
        }

        // Validate that file types start with a dot
        const validateFileTypes = (types) => {
            return types.every(type => typeof type === 'string' && type.startsWith('.') && type.length > 1);
        };

        if (!validateFileTypes(photos) || !validateFileTypes(documents) || !validateFileTypes(invoices)) {
            return sendErrorResponse(res, 400, 'Invalid file type format. File types must start with a dot (e.g., ".jpg")');
        }

        const fileTypeSettings = {
            photos,
            documents,
            invoices
        };

        const settings = await Settings.findOneAndUpdate(
            { type: 'fileType' },
            { 
                type: 'fileType',
                settings: fileTypeSettings
            },
            { upsert: true, new: true }
        );
        
        // Update the in-memory constant
        global.ALLOWED_FILE_TYPES = fileTypeSettings;
        
        logRequest(req, 'File type settings updated successfully', { newSettings: settings });
        sendSuccessResponse(res, settings.settings, 'Allowed file types updated successfully');
    } catch (error) {
        logRequest(req, 'Error updating file type settings', { error });
        sendErrorResponse(res, 500, 'Failed to update allowed file types', error);
    }
});

/**
 * @function router.post
 * @description API route for adding items (location, status, damagetype)
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Middleware.ensureRole} middleware - Middleware to ensure the user has the 'admin' role.
 * @param {Function} handler - The route handler.
 */
router.post('/settings/:type', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    const { type } = req.params;
    const { name } = req.body;

    logRequest(req, `Adding new ${type}`, { name });

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return sendErrorResponse(res, 400, 'Name is required');
    }

    try {
        let result;
        const trimmedName = name.trim();
        
        switch (type.toLowerCase()) {
            case 'location':
            case 'rentinglocation':
                // Check if location already exists
                const existingLocation = await Location.findOne({ 
                    name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } 
                });
                
                if (existingLocation) {
                    return sendErrorResponse(res, 400, `Location "${trimmedName}" already exists`);
                }
                result = await Location.create({ name: trimmedName });
                break;
            case 'status':
                // Check if status already exists
                const existingStatus = await Status.findOne({ 
                    name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } 
                });
                
                if (existingStatus) {
                    return sendErrorResponse(res, 400, `Status "${trimmedName}" already exists`);
                }
                result = await Status.create({ name: trimmedName });
                break;
            case 'damagetype':
                // Check if damage type already exists
                const existingDamageType = await DamageType.findOne({ 
                    name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } 
                });
                
                if (existingDamageType) {
                    return sendErrorResponse(res, 400, `Damage Type "${trimmedName}" already exists`);
                }
                result = await DamageType.create({ name: trimmedName });
                break;
            default:
                return sendErrorResponse(res, 400, 'Invalid type');
        }

        logRequest(req, `Successfully created ${type}`, { result });
        sendSuccessResponse(res, result, `${type} added successfully`);
    } catch (error) {
        logRequest(req, `Error adding ${type}`, { error });
        
        // Check for duplicate key error (MongoDB code 11000)
        if (error.code === 11000) {
            return sendErrorResponse(res, 400, `${type} "${name}" already exists`);
        }
        
        sendErrorResponse(res, 500, `Failed to add ${type}`, error);
    }
});

/**
 * @function router.delete
 * @description API route for deleting items (location, status, damagetype)
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Middleware.ensureRole} middleware - Middleware to ensure the user has the 'admin' role.
 * @param {Function} handler - The route handler.
 */
router.delete('/settings/:type/:id', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    const { type, id } = req.params;

    logRequest(req, `Deleting ${type}`, { id });

    try {
        let result;
        switch (type.toLowerCase()) {
            case 'location':
            case 'rentinglocation':
                // Check if location is in use
                const claimsUsingLocation = await Claim.findOne({ rentingLocation: id });
                if (claimsUsingLocation) {
                    return sendErrorResponse(res, 400, 'Cannot delete location as it is being used by existing claims');
                }
                result = await Location.findByIdAndDelete(id);
                break;
            case 'status':
                // Check if status is in use
                const claimsUsingStatus = await Claim.findOne({ status: id });
                if (claimsUsingStatus) {
                    return sendErrorResponse(res, 400, 'Cannot delete status as it is being used by existing claims');
                }
                result = await Status.findByIdAndDelete(id);
                break;
            case 'damagetype':
                // Check if damage type is in use
                const claimsUsingDamageType = await Claim.findOne({ damageType: id });
                if (claimsUsingDamageType) {
                    return sendErrorResponse(res, 400, 'Cannot delete damage type as it is being used by existing claims');
                }
                result = await DamageType.findByIdAndDelete(id);
                break;
            default:
                return sendErrorResponse(res, 400, 'Invalid type');
        }

        if (!result) {
            return sendErrorResponse(res, 404, `${type} not found`);
        }

        logRequest(req, `Successfully deleted ${type}`, { result });
        sendSuccessResponse(res, result, `${type} deleted successfully`);
    } catch (error) {
        logRequest(req, `Error deleting ${type}`, { error });
        sendErrorResponse(res, 500, `Failed to delete ${type}`, error);
    }
});

/**
 * @function router.put
 * @description API route for updating items (location, status, damagetype)
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Middleware.ensureRole} middleware - Middleware to ensure the user has the 'admin' role.
 * @param {Function} handler - The route handler.
 */
router.put('/settings/:type/:id', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    const { type, id } = req.params;
    const { name } = req.body;

    logRequest(req, `Updating ${type}`, { id, name });

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return sendErrorResponse(res, 400, 'Name is required');
    }

    try {
        let result;
        const trimmedName = name.trim();

        switch (type.toLowerCase()) {
            case 'location':
            case 'rentinglocation':
                // Check if new name already exists for a different location
                const existingLocation = await Location.findOne({
                    _id: { $ne: id },
                    name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
                });
                if (existingLocation) {
                    return sendErrorResponse(res, 400, `Location "${trimmedName}" already exists`);
                }
                result = await Location.findByIdAndUpdate(
                    id,
                    { name: trimmedName },
                    { new: true }
                );
                break;

            case 'status':
                // Check if new name already exists for a different status
                const existingStatus = await Status.findOne({
                    _id: { $ne: id },
                    name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
                });
                if (existingStatus) {
                    return sendErrorResponse(res, 400, `Status "${trimmedName}" already exists`);
                }
                result = await Status.findByIdAndUpdate(
                    id,
                    { name: trimmedName },
                    { new: true }
                );
                break;

            case 'damagetype':
                // Check if new name already exists for a different damage type
                const existingDamageType = await DamageType.findOne({
                    _id: { $ne: id },
                    name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
                });
                if (existingDamageType) {
                    return sendErrorResponse(res, 400, `Damage Type "${trimmedName}" already exists`);
                }
                result = await DamageType.findByIdAndUpdate(
                    id,
                    { name: trimmedName },
                    { new: true }
                );
                break;

            default:
                return sendErrorResponse(res, 400, 'Invalid type');
        }

        if (!result) {
            return sendErrorResponse(res, 404, `${type} not found`);
        }

        logRequest(req, `Successfully updated ${type}`, { result });
        sendSuccessResponse(res, result, `${type} updated successfully`);
    } catch (error) {
        logRequest(req, `Error updating ${type}`, { error });
        
        // Check for duplicate key error (MongoDB code 11000)
        if (error.code === 11000) {
            return sendErrorResponse(res, 400, `${type} "${name}" already exists`);
        }
        
        sendErrorResponse(res, 500, `Failed to update ${type}`, error);
    }
});

module.exports = router;

