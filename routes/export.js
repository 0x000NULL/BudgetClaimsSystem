/**
 * @fileoverview This module defines the export routes for the Budget Claims System.
 * It handles the creation of a full export of users, claims, and uploaded files into a zip archive.
 * Sensitive fields in the request body are filtered out before logging.
 * 
 * @module routes/export
 */

const express = require('express'); // Import Express to create a router
const fs = require('fs'); // Import the file system module to interact with the file system
const path = require('path'); // Import the path module to work with file and directory paths
const archiver = require('archiver'); // Import Archiver to create zip archives
const User = require('../models/User'); // Import the User model to interact with the users collection in MongoDB
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const pinoLogger = require('../logger'); // Import Pino logger

const router = express.Router(); // Create a new router

// Define sensitive fields that should not be logged
const sensitiveFields = ['password', 'token', 'ssn'];

/**
 * Filters out sensitive fields from the provided data object.
 * 
 * @param {Object} data - The data object to filter.
 * @returns {Object} The filtered data object with sensitive fields masked.
 */
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

/**
 * Logs the request details along with user and session information.
 * 
 * @param {Object} req - The Express request object.
 * @param {string} message - The log message.
 * @param {Object} [extra={}] - Additional information to log.
 */
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

/**
 * Route to handle full export of users, claims, and uploaded files.
 * Creates a zip archive containing the data and sends it as a download.
 * 
 * @name GET /full
 * @function
 * @memberof module:routes/export
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
router.get('/full', async (req, res) => {
    logRequest(req, 'Full export initiated');

    try {
        // Create a write stream for the zip file
        const output = fs.createWriteStream(path.join(__dirname, '../exports/full_export.zip'));
        const archive = archiver('zip', {
            zlib: { level: 9 } // Set the compression level
        });

        // Event listener when the archive has been finalized and the output file descriptor has closed
        output.on('close', () => {
            logRequest(req, `${archive.pointer()} total bytes. Archiver has been finalized and the output file descriptor has closed.`);
            res.download(path.join(__dirname, '../exports/full_export.zip')); // Send the zip file as a download
        });

        // Event listener when data has been drained from the output
        output.on('end', () => {
            logRequest(req, 'Data has been drained');
        });

        // Event listener for warnings (e.g., stat failures and other non-blocking errors)
        archive.on('warning', (err) => {
            if (err.code !== 'ENOENT') {
                throw err; // Throw error if it's not a file not found error
            } else {
                logRequest(req, 'Archive warning', { warning: err.message });
            }
        });

        // Event listener for errors
        archive.on('error', (err) => {
            logRequest(req, 'Archive error', { error: err.message });
            throw err; // Throw the error
        });

        // Pipe the archive data to the file
        archive.pipe(output);

        // Fetch users from the database and add to the archive
        const users = await User.find({});
        const usersJson = JSON.stringify(users);
        archive.append(usersJson, { name: 'users.json' });

        // Fetch claims from the database and add to the archive
        const claims = await Claim.find({});
        const claimsJson = JSON.stringify(claims);
        archive.append(claimsJson, { name: 'claims.json' });

        // Add files from the uploads directory to the archive
        const uploadsDir = path.join(__dirname, '../uploads');
        fs.readdirSync(uploadsDir).forEach(file => {
            archive.file(path.join(uploadsDir, file), { name: `uploads/${file}` });
        });

        // Finalize the archive (i.e., all data has been appended)
        archive.finalize();
    } catch (error) {
        logRequest(req, 'Error during export', { error: error.message });
        res.status(500).send('Error during export'); // Send error response
    }
});

module.exports = router; // Export the router
