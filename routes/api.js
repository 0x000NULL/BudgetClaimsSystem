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
router.get('/claims', ensureAuthenticated, (req, res) => {
    logRequest(req, 'Fetching all claims');
    // Fetch all claims from the database
    Claim.find()
        .then(claims => {
            logRequest(req, 'Claims fetched successfully', { claims });
            res.json(claims); // Respond with all claims
        })
        .catch(err => {
            logRequest(req, 'Error fetching claims', { error: err });
            res.status(500).json({ error: err.message }); // Handle errors
        });
});

// API route to get a specific claim by ID
router.get('/claims/:id', ensureAuthenticated, (req, res) => {
    logRequest(req, 'Fetching claim by ID', { claimId: req.params.id });
    // Fetch a claim by its ID from the database
    Claim.findById(req.params.id)
        .then(claim => {
            if (!claim) {
                logRequest(req, 'Claim not found', { claimId: req.params.id });
                return res.status(404).json({ msg: 'Claim not found' }); // Handle case where claim is not found
            }
            logRequest(req, 'Claim fetched successfully', { claim });
            res.json(claim); // Respond with the claim
        })
        .catch(err => {
            logRequest(req, 'Error fetching claim by ID', { error: err });
            res.status(500).json({ error: err.message }); // Handle errors
        });
});

// API route to add a new claim
router.post('/claims', ensureAuthenticated, (req, res) => {
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

    // Save the claim to the database
    newClaim.save()
        .then(claim => {
            logRequest(req, 'New claim saved successfully', { claim });
            res.json(claim); // Respond with the saved claim
        })
        .catch(err => {
            logRequest(req, 'Error saving new claim', { error: err });
            res.status(500).json({ error: err.message }); // Handle errors
        });
});

// API route to update a claim by ID
router.put('/claims/:id', ensureAuthenticated, (req, res) => {
    logRequest(req, 'Updating claim by ID', { claimId: req.params.id });
    // Update the claim in the database
    Claim.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .then(claim => {
            if (!claim) {
                logRequest(req, 'Claim not found for update', { claimId: req.params.id });
                return res.status(404).json({ msg: 'Claim not found' }); // Handle case where claim is not found
            }
            logRequest(req, 'Claim updated successfully', { claim });
            res.json(claim); // Respond with the updated claim
        })
        .catch(err => {
            logRequest(req, 'Error updating claim by ID', { error: err });
            res.status(500).json({ error: err.message }); // Handle errors
        });
});

// API route to delete a claim by ID
router.delete('/claims/:id', ensureAuthenticated, ensureRole('admin'), (req, res) => {
    logRequest(req, 'Deleting claim by ID', { claimId: req.params.id });
    // Delete the claim from the database
    Claim.findByIdAndDelete(req.params.id)
        .then(claim => {
            if (!claim) {
                logRequest(req, 'Claim not found for deletion', { claimId: req.params.id });
                return res.status(404).json({ msg: 'Claim not found' }); // Handle case where claim is not found
            }
            logRequest(req, 'Claim deleted successfully', { claimId: req.params.id });
            res.json({ msg: 'Claim deleted' }); // Respond with deletion confirmation
        })
        .catch(err => {
            logRequest(req, 'Error deleting claim by ID', { error: err });
            res.status(500).json({ error: err.message }); // Handle errors
        });
});

// API route to get all customers
router.get('/customers', ensureAuthenticated, (req, res) => {
    logRequest(req, 'Fetching all customers');
    // Fetch all customers from the database
    Customer.find()
        .then(customers => {
            logRequest(req, 'Customers fetched successfully', { customers });
            res.json(customers); // Respond with all customers
        })
        .catch(err => {
            logRequest(req, 'Error fetching customers', { error: err });
            res.status(500).json({ error: err.message }); // Handle errors
        });
});

// API route to get a specific customer by ID
router.get('/customers/:id', ensureAuthenticated, (req, res) => {
    logRequest(req, 'Fetching customer by ID', { customerId: req.params.id });
    // Fetch a customer by its ID from the database
    Customer.findById(req.params.id)
        .then(customer => {
            if (!customer) {
                logRequest(req, 'Customer not found', { customerId: req.params.id });
                return res.status(404).json({ msg: 'Customer not found' }); // Handle case where customer is not found
            }
            logRequest(req, 'Customer fetched successfully', { customer });
            res.json(customer); // Respond with the customer
        })
        .catch(err => {
            logRequest(req, 'Error fetching customer by ID', { error: err });
            res.status(500).json({ error: err.message }); // Handle errors
        });
});

// API route to add a new customer
router.post('/customers', ensureAuthenticated, ensureRole('admin'), (req, res) => {
    logRequest(req, 'Adding a new customer');
    const { name, email, password } = req.body; // Extract customer details from the request body

    // Create a new customer object
    const newCustomer = new Customer({
        name,
        email,
        password // Password should be hashed before saving in a real-world application
    });

    // Save the customer to the database
    newCustomer.save()
        .then(customer => {
            logRequest(req, 'New customer saved successfully', { customer });
            res.json(customer); // Respond with the saved customer
        })
        .catch(err => {
            logRequest(req, 'Error saving new customer', { error: err });
            res.status(500).json({ error: err.message }); // Handle errors
        });
});

// API route to update a customer by ID
router.put('/customers/:id', ensureAuthenticated, ensureRole('admin'), (req, res) => {
    logRequest(req, 'Updating customer by ID', { customerId: req.params.id });
    // Update the customer in the database
    Customer.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .then(customer => {
            if (!customer) {
                logRequest(req, 'Customer not found for update', { customerId: req.params.id });
                return res.status(404).json({ msg: 'Customer not found' }); // Handle case where customer is not found
            }
            logRequest(req, 'Customer updated successfully', { customer });
            res.json(customer); // Respond with the updated customer
        })
        .catch(err => {
            logRequest(req, 'Error updating customer by ID', { error: err });
            res.status(500).json({ error: err.message }); // Handle errors
        });
});

// API route to delete a customer by ID
router.delete('/customers/:id', ensureAuthenticated, ensureRole('admin'), (req, res) => {
    logRequest(req, 'Deleting customer by ID', { customerId: req.params.id });
    // Delete the customer from the database
    Customer.findByIdAndDelete(req.params.id)
        .then(customer => {
            if (!customer) {
                logRequest(req, 'Customer not found for deletion', { customerId: req.params.id });
                return res.status(404).json({ msg: 'Customer not found' }); // Handle case where customer is not found
            }
            logRequest(req, 'Customer deleted successfully', { customerId: req.params.id });
            res.json({ msg: 'Customer deleted' }); // Respond with deletion confirmation
        })
        .catch(err => {
            logRequest(req, 'Error deleting customer by ID', { error: err });
            res.status(500).json({ error: err.message }); // Handle errors
        });
});

module.exports = router; // Export the router
