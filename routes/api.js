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
 * @function router.get
 * @description API route to get all customers.
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Function} handler - The route handler.
 */

 /**
 * @function router.get
 * @description API route to get a specific customer by ID.
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Function} handler - The route handler.
 */

 /**
 * @function router.post
 * @description API route to add a new customer.
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Middleware.ensureRole} middleware - Middleware to ensure the user has the 'admin' role.
 * @param {Function} handler - The route handler.
 */

 /**
 * @function router.put
 * @description API route to update a customer by ID.
 * @param {string} path - The route path.
 * @param {Middleware.ensureAuthenticated} middleware - Middleware to ensure the user is authenticated.
 * @param {Middleware.ensureRole} middleware - Middleware to ensure the user has the 'admin' role.
 * @param {Function} handler - The route handler.
 */

 /**
 * @function router.delete
 * @description API route to delete a customer by ID.
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
const logRequest = (req, message, extra = {}) => {
    const { method, originalUrl, headers, body } = req;
    const filteredBody = filterSensitiveData(body); // Filter sensitive data from the request body

    pinoLogger.info({
        message, // Log message
        user: req.user ? req.user.email : 'Unauthenticated', // Log user
        ip: req.ip, // Log IP address
        sessionId: req.sessionID, // Log session ID
        timestamp: new Date().toISOString(), // Add a timestamp
        method, // Log HTTP method
        url: originalUrl, // Log originating URL
        requestBody: filteredBody, // Log the filtered request body
        headers // Log request headers
    });
};

// API route to get all claims
router.get('/claims', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Fetching all claims');
    try {
        const claims = await Claim.find();
        logRequest(req, 'Claims fetched successfully', { claims });
        res.json(claims); // Respond with all claims
    } catch (err) {
        logRequest(req, 'Error fetching claims', { error: err });
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// API route to get a specific claim by ID
router.get('/claims/:id', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Fetching claim by ID', { claimId: req.params.id });
    try {
        const claim = await Claim.findById(req.params.id);
        if (!claim) {
            logRequest(req, 'Claim not found', { claimId: req.params.id });
            return res.status(404).json({ msg: 'Claim not found' }); // Handle case where claim is not found
        }
        logRequest(req, 'Claim fetched successfully', { claim });
        res.json(claim); // Respond with the claim
    } catch (err) {
        logRequest(req, 'Error fetching claim by ID', { error: err });
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// API route to add a new claim
router.post('/claims', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Adding a new claim');
    const { mva, customerName, description, status } = req.body; // Extract claim details from the request body

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
        res.json(claim); // Respond with the saved claim
    } catch (err) {
        logRequest(req, 'Error saving new claim', { error: err });
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// API route to update a claim by ID
router.put('/claims/:id', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Updating claim by ID', { claimId: req.params.id });
    try {
        const claim = await Claim.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!claim) {
            logRequest(req, 'Claim not found for update', { claimId: req.params.id });
            return res.status(404).json({ msg: 'Claim not found' }); // Handle case where claim is not found
        }
        logRequest(req, 'Claim updated successfully', { claim });
        res.json(claim); // Respond with the updated claim
    } catch (err) {
        logRequest(req, 'Error updating claim by ID', { error: err });
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// API route to delete a claim by ID
router.delete('/claims/:id', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    logRequest(req, 'Deleting claim by ID', { claimId: req.params.id });
    try {
        const claim = await Claim.findByIdAndDelete(req.params.id);
        if (!claim) {
            logRequest(req, 'Claim not found for deletion', { claimId: req.params.id });
            return res.status(404).json({ msg: 'Claim not found' }); // Handle case where claim is not found
        }
        logRequest(req, 'Claim deleted successfully', { claimId: req.params.id });
        res.json({ msg: 'Claim deleted' }); // Respond with deletion confirmation
    } catch (err) {
        logRequest(req, 'Error deleting claim by ID', { error: err });
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// API route to get all customers
router.get('/customers', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Fetching all customers');
    try {
        const customers = await Customer.find();
        logRequest(req, 'Customers fetched successfully', { customers });
        res.json(customers); // Respond with all customers
    } catch (err) {
        logRequest(req, 'Error fetching customers', { error: err });
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// API route to get a specific customer by ID
router.get('/customers/:id', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Fetching customer by ID', { customerId: req.params.id });
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            logRequest(req, 'Customer not found', { customerId: req.params.id });
            return res.status(404).json({ msg: 'Customer not found' }); // Handle case where customer is not found
        }
        logRequest(req, 'Customer fetched successfully', { customer });
        res.json(customer); // Respond with the customer
    } catch (err) {
        logRequest(req, 'Error fetching customer by ID', { error: err });
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// API route to add a new customer
router.post('/customers', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    logRequest(req, 'Adding a new customer');
    const { name, email, password } = req.body; // Extract customer details from the request body

    // Create a new customer object
    const newCustomer = new Customer({
        name,
        email,
        password // Password should be hashed before saving in a real-world application
    });

    try {
        const customer = await newCustomer.save();
        logRequest(req, 'New customer saved successfully', { customer });
        res.json(customer); // Respond with the saved customer
    } catch (err) {
        logRequest(req, 'Error saving new customer', { error: err });
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// API route to update a customer by ID
router.put('/customers/:id', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    logRequest(req, 'Updating customer by ID', { customerId: req.params.id });
    try {
        const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!customer) {
            logRequest(req, 'Customer not found for update', { customerId: req.params.id });
            return res.status(404).json({ msg: 'Customer not found' }); // Handle case where customer is not found
        }
        logRequest(req, 'Customer updated successfully', { customer });
        res.json(customer); // Respond with the updated customer
    } catch (err) {
        logRequest(req, 'Error updating customer by ID', { error: err });
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// API route to delete a customer by ID
router.delete('/customers/:id', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    logRequest(req, 'Deleting customer by ID', { customerId: req.params.id });
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        if (!customer) {
            logRequest(req, 'Customer not found for deletion', { customerId: req.params.id });
            return res.status(404).json({ msg: 'Customer not found' }); // Handle case where customer is not found
        }
        logRequest(req, 'Customer deleted successfully', { customerId: req.params.id });
        res.json({ msg: 'Customer deleted' }); // Respond with deletion confirmation
    } catch (err) {
        logRequest(req, 'Error deleting customer by ID', { error: err });
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// API route to update max files per category
router.post('/settings/file-count', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    try {
        const newSettings = {
            photos: parseInt(req.body.photos),
            documents: parseInt(req.body.documents),
            invoices: parseInt(req.body.invoices)
        };

        const settings = await Settings.updateSettings('fileCount', newSettings);
        
        // Update the global constant
        global.MAX_FILES_PER_CATEGORY = newSettings;
        
        res.json({ 
            success: true,
            message: 'File count settings updated successfully',
            settings: settings
        });
    } catch (error) {
        console.error('Error updating file count settings:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update file count settings',
            details: error.message 
        });
    }
});

// API route to update max file sizes
router.post('/settings/file-sizes', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    try {
        const newSettings = {
            photos: parseInt(req.body.photos) * 1024 * 1024,
            documents: parseInt(req.body.documents) * 1024 * 1024,
            invoices: parseInt(req.body.invoices) * 1024 * 1024
        };

        const settings = await Settings.updateSettings('fileSize', newSettings);
        
        // Update the global constant
        global.MAX_FILE_SIZES = newSettings;
        
        res.json({ 
            success: true,
            message: 'File size settings updated successfully',
            settings: settings
        });
    } catch (error) {
        console.error('Error updating file size settings:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update file size settings',
            details: error.message
        });
    }
});

// API route to update allowed file types
router.post('/settings/file-types', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    logRequest(req, 'Updating allowed file types', { settings: req.body });
    try {
        const settings = await Settings.findOneAndUpdate(
            { type: 'fileType' },
            { 
                type: 'fileType',
                settings: req.body 
            },
            { upsert: true, new: true }
        );
        
        // Update the in-memory constant
        Object.assign(ALLOWED_FILE_TYPES, req.body);
        
        logRequest(req, 'File type settings updated successfully', { newSettings: settings });
        res.json({ 
            message: 'Allowed file types updated successfully',
            settings: settings.settings 
        });
    } catch (error) {
        logRequest(req, 'Error updating file type settings', { error });
        res.status(500).json({ error: error.message });
    }
});

// Add this route to handle the general settings page
router.get('/general-settings', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    try {
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
            fileSize: fileSize || { settings: {} },
            fileCount: fileCount || { settings: {} },
            fileType: fileType || { settings: {} }
        };

        // Log what we're sending to the template
        console.log('Rendering general_settings with:', {
            settingsCount: Object.keys(dbSettings).length,
            locationsCount: locations.length,
            statusesCount: statuses.length,
            damageTypesCount: damageTypes.length
        });

        res.render('general_settings', {
            dbSettings,
            locations,    // Pass locations to the template
            statuses,
            damageTypes
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).send('Error loading settings');
    }
});

// Update the API route for adding items
router.post('/settings/:type', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    const { type } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Name is required'
        });
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
                    return res.status(400).json({
                        success: false,
                        message: `Location "${trimmedName}" already exists`
                    });
                }
                result = await Location.create({ name: trimmedName });
                break;
            case 'status':
                result = await Status.create({ name: trimmedName });
                break;
            case 'damagetype':
                result = await DamageType.create({ name: trimmedName });
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid type'
                });
        }

        console.log(`Successfully created ${type}:`, result);

        res.json({
            success: true,
            data: result,
            message: `${type} added successfully`
        });
    } catch (error) {
        console.error(`Error adding ${type}:`, {
            error: error.message,
            stack: error.stack,
            type,
            name
        });
        
        // Provide a more user-friendly error message
        const errorMessage = error.code === 11000 
            ? `${type} "${name}" already exists` 
            : `Failed to add ${type}`;
            
        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
});

// API route for deleting items
router.delete('/settings/:type/:id', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    const { type, id } = req.params;

    try {
        let result;
        switch (type.toLowerCase()) {
            case 'location':
            case 'rentinglocation':
                // Check if location is in use
                const claimsUsingLocation = await Claim.findOne({ rentingLocation: id });
                if (claimsUsingLocation) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot delete location as it is being used by existing claims'
                    });
                }
                result = await Location.findByIdAndDelete(id);
                break;
            case 'status':
                // Check if status is in use
                const claimsUsingStatus = await Claim.findOne({ status: id });
                if (claimsUsingStatus) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot delete status as it is being used by existing claims'
                    });
                }
                result = await Status.findByIdAndDelete(id);
                break;
            case 'damagetype':
                // Check if damage type is in use
                const claimsUsingDamageType = await Claim.findOne({ damageType: id });
                if (claimsUsingDamageType) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot delete damage type as it is being used by existing claims'
                    });
                }
                result = await DamageType.findByIdAndDelete(id);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid type'
                });
        }

        if (!result) {
            return res.status(404).json({
                success: false,
                message: `${type} not found`
            });
        }

        console.log(`Successfully deleted ${type}:`, result);

        res.json({
            success: true,
            message: `${type} deleted successfully`,
            data: result
        });
    } catch (error) {
        console.error(`Error deleting ${type}:`, {
            error: error.message,
            stack: error.stack,
            type,
            id
        });
        
        res.status(500).json({
            success: false,
            message: `Failed to delete ${type}`,
            error: error.message
        });
    }
});

// API route for updating items
router.put('/settings/:type/:id', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
    const { type, id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Name is required'
        });
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
                    return res.status(400).json({
                        success: false,
                        message: `Location "${trimmedName}" already exists`
                    });
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
                    return res.status(400).json({
                        success: false,
                        message: `Status "${trimmedName}" already exists`
                    });
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
                    return res.status(400).json({
                        success: false,
                        message: `Damage Type "${trimmedName}" already exists`
                    });
                }
                result = await DamageType.findByIdAndUpdate(
                    id,
                    { name: trimmedName },
                    { new: true }
                );
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid type'
                });
        }

        if (!result) {
            return res.status(404).json({
                success: false,
                message: `${type} not found`
            });
        }

        console.log(`Successfully updated ${type}:`, result);

        res.json({
            success: true,
            data: result,
            message: `${type} updated successfully`
        });
    } catch (error) {
        console.error(`Error updating ${type}:`, {
            error: error.message,
            stack: error.stack,
            type,
            id,
            name
        });
        
        res.status(500).json({
            success: false,
            message: `Failed to update ${type}`,
            error: error.message
        });
    }
});

module.exports = router; // Export the router
