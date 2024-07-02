const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const User = require('../models/User');
const Claim = require('../models/Claim');

const router = express.Router();

router.get('/full', async (req, res) => {
    try {
        const output = fs.createWriteStream(path.join(__dirname, '../exports/full_export.zip'));
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', () => {
            console.log(`${archive.pointer()} total bytes`);
            console.log('Archiver has been finalized and the output file descriptor has closed.');
            res.download(path.join(__dirname, '../exports/full_export.zip'));
        });

        output.on('end', () => {
            console.log('Data has been drained');
        });

        archive.on('warning', (err) => {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);

        // Add Users JSON
        const users = await User.find({});
        const usersJson = JSON.stringify(users);
        archive.append(usersJson, { name: 'users.json' });

        // Add Claims JSON
        const claims = await Claim.find({});
        const claimsJson = JSON.stringify(claims);
        archive.append(claimsJson, { name: 'claims.json' });

        // Add Uploads
        const uploadsDir = path.join(__dirname, '../uploads');
        fs.readdirSync(uploadsDir).forEach(file => {
            archive.file(path.join(uploadsDir, file), { name: `uploads/${file}` });
        });

        // Finalize the archive
        archive.finalize();
    } catch (error) {
        console.error('Error during export:', error);
        res.status(500).send('Error during export');
    }
});

module.exports = router;
