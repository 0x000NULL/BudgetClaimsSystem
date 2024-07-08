const express = require('express'); // Import Express to create a router
const fs = require('fs'); // Import the file system module to interact with the file system
const path = require('path'); // Import the path module to work with file and directory paths
const archiver = require('archiver'); // Import Archiver to create zip archives
const User = require('../models/User'); // Import the User model to interact with the users collection in MongoDB
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB

const router = express.Router(); // Create a new router

// Route to handle full export
router.get('/full', async (req, res) => {
    try {
        // Create a write stream for the zip file
        const output = fs.createWriteStream(path.join(__dirname, '../exports/full_export.zip'));
        const archive = archiver('zip', {
            zlib: { level: 9 } // Set the compression level
        });

        // Event listener when the archive has been finalized and the output file descriptor has closed
        output.on('close', () => {
            console.log(`${archive.pointer()} total bytes`);
            console.log('Archiver has been finalized and the output file descriptor has closed.');
            res.download(path.join(__dirname, '../exports/full_export.zip')); // Send the zip file as a download
        });

        // Event listener when data has been drained from the output
        output.on('end', () => {
            console.log('Data has been drained');
        });

        // Event listener for warnings (e.g., stat failures and other non-blocking errors)
        archive.on('warning', (err) => {
            if (err.code !== 'ENOENT') {
                throw err; // Throw error if it's not a file not found error
            }
        });

        // Event listener for errors
        archive.on('error', (err) => {
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
        console.error('Error during export:', error); // Log any errors
        res.status(500).send('Error during export'); // Send error response
    }
});

module.exports = router; // Export the router
