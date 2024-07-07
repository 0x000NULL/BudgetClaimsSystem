const express = require('express'); // Import Express to create a router
const fs = require('fs'); // Import Node.js file system module to handle file operations
const path = require('path'); // Import Node.js path module to handle and transform file paths
const multer = require('multer'); // Import multer for handling file uploads
const User = require('../models/User'); // Import the User model to interact with the users collection in MongoDB
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const archiver = require('archiver'); // Import archiver for creating zip files (not used in this code snippet)
const extract = require('extract-zip'); // Import extract-zip for extracting zip files

const router = express.Router(); // Create a new router

// Configure multer to store uploaded files in the 'uploads/' directory
const upload = multer({ dest: 'uploads/' });

// Route to handle full data import
router.post('/full', upload.single('file'), async (req, res) => {
    try {
        // Path of the uploaded zip file
        const filePath = req.file.path;
        // Path to extract the contents of the zip file
        const extractPath = path.join(__dirname, '../imports');

        // Extract the zip file to the specified directory
        await extract(filePath, { dir: extractPath });

        // Read and parse the users.json file
        const usersData = fs.readFileSync(path.join(extractPath, 'users.json'), 'utf8');
        const users = JSON.parse(usersData);

        // Insert users into the database
        await User.deleteMany({}); // Remove all existing users
        await User.insertMany(users); // Insert new users from the parsed JSON

        // Read and parse the claims.json file
        const claimsData = fs.readFileSync(path.join(extractPath, 'claims.json'), 'utf8');
        const claims = JSON.parse(claimsData);

        // Insert claims into the database
        await Claim.deleteMany({}); // Remove all existing claims
        await Claim.insertMany(claims); // Insert new claims from the parsed JSON

        // Directory containing the files to be copied
        const uploadsDir = path.join(extractPath, 'uploads');
        // Iterate through each file in the directory and copy it to the 'uploads/' directory
        fs.readdirSync(uploadsDir).forEach(file => {
            const srcPath = path.join(uploadsDir, file);
            const destPath = path.join(__dirname, '../uploads', file);
            fs.copyFileSync(srcPath, destPath); // Copy file from source to destination
        });

        // Send success response
        res.status(200).send('Import completed successfully');
    } catch (error) {
        console.error('Error during import:', error); // Log error if any occurs
        res.status(500).send('Error during import'); // Send error response
    }
});

module.exports = router; // Export the router
