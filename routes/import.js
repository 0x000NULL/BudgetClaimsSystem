const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const User = require('../models/User');
const Claim = require('../models/Claim');
const archiver = require('archiver');
const extract = require('extract-zip');

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.post('/full', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const extractPath = path.join(__dirname, '../imports');

        // Extract the zip file
        await extract(filePath, { dir: extractPath });

        // Read and parse the users.json file
        const usersData = fs.readFileSync(path.join(extractPath, 'users.json'), 'utf8');
        const users = JSON.parse(usersData);

        // Insert users into the database
        await User.deleteMany({});
        await User.insertMany(users);

        // Read and parse the claims.json file
        const claimsData = fs.readFileSync(path.join(extractPath, 'claims.json'), 'utf8');
        const claims = JSON.parse(claimsData);

        // Insert claims into the database
        await Claim.deleteMany({});
        await Claim.insertMany(claims);

        // Copy uploaded files to the uploads directory
        const uploadsDir = path.join(extractPath, 'uploads');
        fs.readdirSync(uploadsDir).forEach(file => {
            const srcPath = path.join(uploadsDir, file);
            const destPath = path.join(__dirname, '../uploads', file);
            fs.copyFileSync(srcPath, destPath);
        });

        res.status(200).send('Import completed successfully');
    } catch (error) {
        console.error('Error during import:', error);
        res.status(500).send('Error during import');
    }
});

module.exports = router;
