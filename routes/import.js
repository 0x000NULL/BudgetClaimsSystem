const express = require('express'); // Import Express to create a router
const fs = require('fs'); // Import Node.js file system module to handle file operations
const path = require('path'); // Import Node.js path module to handle and transform file paths
const multer = require('multer'); // Import multer for handling file uploads
const User = require('../models/User'); // Import the User model to interact with the users collection in MongoDB
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const archiver = require('archiver'); // Import archiver for creating zip files (not used in this code snippet)
const extract = require('extract-zip'); // Import extract-zip for extracting zip files
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

// Configure multer to store uploaded files in the 'uploads/' directory
const upload = multer({ dest: 'uploads/' });

// Route to handle full data import
router.post('/full', upload.single('file'), async (req, res) => {
    logRequest(req, 'Import route accessed');
    try {
        // Path of the uploaded zip file
        const filePath = req.file.path;
        logRequest(req, 'Uploaded file path', { filePath });

        // Path to extract the contents of the zip file
        const extractPath = path.join(__dirname, '../imports');
        logRequest(req, 'Extract path', { extractPath });

        // Extract the zip file to the specified directory
        await extract(filePath, { dir: extractPath });
        logRequest(req, 'Zip file extracted');

        // Read and parse the users.json file
        const usersData = fs.readFileSync(path.join(extractPath, 'users.json'), 'utf8');
        const users = JSON.parse(usersData);
        logRequest(req, 'Users data parsed', { usersCount: users.length });

        // Insert users into the database
        await User.deleteMany({}); // Remove all existing users
        await User.insertMany(users); // Insert new users from the parsed JSON
        logRequest(req, 'Users imported');

        // Read and parse the claims.json file
        const claimsData = fs.readFileSync(path.join(extractPath, 'claims.json'), 'utf8');
        const claims = JSON.parse(claimsData);
        logRequest(req, 'Claims data parsed', { claimsCount: claims.length });

        // Insert claims into the database
        await Claim.deleteMany({}); // Remove all existing claims
        await Claim.insertMany(claims); // Insert new claims from the parsed JSON
        logRequest(req, 'Claims imported');

        // Directory containing the files to be copied
        const uploadsDir = path.join(extractPath, 'uploads');
        logRequest(req, 'Uploads directory', { uploadsDir });

        // Iterate through each file in the directory and copy it to the 'uploads/' directory
        fs.readdirSync(uploadsDir).forEach(file => {
            const srcPath = path.join(uploadsDir, file);
            const destPath = path.join(__dirname, '../uploads', file);
            fs.copyFileSync(srcPath, destPath); // Copy file from source to destination
            logRequest(req, 'File copied', { fileName: file, srcPath, destPath });
        });

        logRequest(req, 'Import completed successfully');
        // Send success response
        res.status(200).send('Import completed successfully');
    } catch (error) {
        logRequest(req, 'Error during import', { error });
        console.error('Error during import:', error); // Log error if any occurs
        res.status(500).send('Error during import'); // Send error response
    }
});

module.exports = router; // Export the router
