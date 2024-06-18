// Import required modules
const express = require('express');
const Claim = require('../models/Claim');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');

// Create a new router
const router = express.Router();

// Route to add a new claim
router.post('/', (req, res) => {
    const { mva, customerName, description, status } = req.body;

    let filesArray = [];
    if (req.files) {
        const files = req.files.files;
        if (!Array.isArray(files)) filesArray.push(files);
        else filesArray = files;

        // Save each file to the uploads directory
        filesArray.forEach(file => {
            const filePath = path.join(__dirname, '../uploads', file.name);
            file.mv(filePath, err => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
            });
        });
    }

    // Create a new claim object
    const newClaim = new Claim({
        mva,
        customerName,
        description,
        status,
        files: filesArray.map(file => file.name)
    });

    // Save the claim to the database
    newClaim.save()
        .then(claim => res.json(claim))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Route to get all claims
router.get('/', (req, res) => {
    Claim.find()
        .then(claims => res.json(claims))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Route to get a claim by ID
router.get('/:id', (req, res) => {
    Claim.findById(req.params.id)
        .then(claim => res.json(claim))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Route to update a claim by ID
router.put('/:id', (req, res) => {
    Claim.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .then(claim => res.json(claim))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Route to delete a claim by ID
router.delete('/:id', (req, res) => {
    Claim.findByIdAndDelete(req.params.id)
        .then(() => res.json({ msg: 'Claim deleted' }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Route to export claims to CSV
router.get('/export/csv', (req, res) => {
    Claim.find()
        .then(claims => {
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "MVA,CustomerName,Description,Status,Date\n";
            claims.forEach(claim => {
                csvContent += `${claim.mva},${claim.customerName},${claim.description},${claim.status},${claim.date}\n`;
            });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=claims.csv');
            res.send(csvContent);
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

// Route to export claims to Excel
router.get('/export/excel', (req, res) => {
    Claim.find()
        .then(claims => {
            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.json_to_sheet(claims.map(claim => ({
                MVA: claim.mva,
                CustomerName: claim.customerName,
                Description: claim.description,
                Status: claim.status,
                Date: claim.date
            })));
            xlsx.utils.book_append_sheet(wb, ws, 'Claims');
            const filePath = path.join(__dirname, '../uploads/claims.xlsx');
            xlsx.writeFile(wb, filePath);
            res.download(filePath);
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

// Route to export claims to PDF
router.get('/export/pdf', (req, res) => {
    Claim.find()
        .then(claims => {
            const doc = new PDFDocument();
            const filePath = path.join(__dirname, '../uploads/claims.pdf');
            doc.pipe(fs.createWriteStream(filePath));
            doc.fontSize(12).text('Claims Report', { align: 'center' });
            claims.forEach(claim => {
                doc.text(`MVA: ${claim.mva}`);
                doc.text(`Customer Name: ${claim.customerName}`);
                doc.text(`Description: ${claim.description}`);
                doc.text(`Status: ${claim.status}`);
                doc.text(`Date: ${claim.date}`);
                doc.text('--------------------------');
            });
            doc.end();
            doc.on('finish', () => {
                res.download(filePath);
            });
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

// Export the router
module.exports = router;
