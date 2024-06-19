const express = require('express'); // Import Express to create a router
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const path = require('path'); // Import Path to handle file and directory paths
const { ensureAuthenticated, ensureRoles, ensureRole } = require('../middleware/auth'); // Import authentication and role-checking middleware
const logActivity = require('../middleware/activityLogger'); // Import activity logging middleware
const { notifyNewClaim, notifyClaimStatusUpdate } = require('../notifications/notify'); // Import notification functions
const csv = require('csv-express'); // Import csv-express for CSV export
const ExcelJS = require('exceljs'); // Import ExcelJS for Excel export
const pdfkit = require('pdfkit'); // Import PDFKit for PDF export
const cacheManager = require('cache-manager'); // Import cache manager for caching
const redisStore = require('cache-manager-redis-store'); // Import Redis store for cache manager

// Setup cache manager with Redis
const cache = cacheManager.caching({
    store: redisStore,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    ttl: 600 // Time-to-live for cached data (in seconds)
});

const router = express.Router(); // Create a new router

// Route to display the add claim form
router.get('/add', ensureAuthenticated, ensureRoles(['admin', 'manager']), (req, res) => {
    console.log('Add claim route accessed');
    res.render('add_claim', { title: 'Add Claim' });
});

// Route to search for claims, accessible by admin, manager, and employee
router.get('/search', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), (req, res) => {
    console.log('Claims search route accessed');
    const { mva, customerName, status, startDate, endDate } = req.query; // Extract query parameters

    // Build a filter object based on provided query parameters
    let filter = {};
    if (mva) filter.mva = mva;
    if (customerName) filter.customerName = new RegExp(customerName, 'i'); // Case-insensitive search
    if (status) filter.status = status;
    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate); // Filter by start date
        if (endDate) filter.date.$lte = new Date(endDate); // Filter by end date
    }

    // Find claims based on the filter object
    Claim.find(filter)
        .then(claims => {
            console.log('Claims found:', claims);
            res.render('claims_search', { claims });
        }) // Respond with filtered claims
        .catch(err => {
            console.error('Error fetching claims:', err);
            res.status(500).json({ error: err.message });
        }); // Handle errors
});

// Route to get all claims or filter claims based on query parameters, accessible by admin, manager, and employee
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), logActivity('Viewed claims list'), async (req, res) => {
    console.log('Fetching claims with query:', req.query);
    const { mva, customerName, status, startDate, endDate } = req.query; // Extract query parameters

    // Build a filter object based on provided query parameters
    let filter = {};
    if (mva) filter.mva = mva;
    if (customerName) filter.customerName = new RegExp(customerName, 'i'); // Case-insensitive search
    if (status) filter.status = status;
    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate); // Filter by start date
        if (endDate) filter.date.$lte = new Date(endDate); // Filter by end date
    }

    const cacheKey = JSON.stringify(filter); // Create a cache key based on the filter

    try {
        // Attempt to get the cached data
        const cachedClaims = await cache.get(cacheKey);
        if (cachedClaims) {
            console.log('Returning cached claims data:', cachedClaims);
            // If cached data exists, respond with it
            return res.json(cachedClaims);
        }

        // If no cached data, fetch claims from the database
        const claims = await Claim.find(filter).exec();
        console.log('Claims fetched from database:', claims);
        // Cache the fetched data
        await cache.set(cacheKey, claims);
        // Respond with the fetched data
        res.json(claims);
    } catch (err) {
        console.error('Error fetching claims:', err);
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// Route to add a new claim, accessible by admin and manager
router.post('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Added new claim'), (req, res) => {
    const { 
        mva, 
        customerName, 
        customerNumber, 
        customerEmail, 
        customerAddress, 
        customerDriversLicense, 
        carMake, 
        carModel, 
        carYear, 
        carColor, 
        carVIN, 
        description, 
        status 
    } = req.body;

    console.log('Adding new claim with data:', req.body);

    let filesArray = [];

    if (req.files) {
        const files = req.files.files;
        if (!Array.isArray(files)) filesArray.push(files);
        else filesArray = files;

        filesArray.forEach(file => {
            const filePath = path.join(__dirname, '../uploads', file.name);
            file.mv(filePath, err => {
                if (err) {
                    console.error('Error uploading file:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('File uploaded successfully:', file.name);
            });
        });
    }

    const newClaim = new Claim({
        mva,
        customerName,
        customerNumber,
        customerEmail,
        customerAddress,
        customerDriversLicense,
        carMake,
        carModel,
        carYear,
        carColor,
        carVIN,
        description,
        status,
        files: filesArray.map(file => file.name)
    });

    newClaim.save()
        .then(claim => {
            console.log('New claim added:', claim);
            notifyNewClaim(req.user.email, claim);
            cache.del('/claims');
            res.redirect('/dashboard');
        })
        .catch(err => {
            console.error('Error adding new claim:', err);
            res.status(500).json({ error: err.message });
        });
});

// Route to get a specific claim by ID for editing, accessible by admin and manager
router.get('/:id/edit', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Viewed claim edit form'), async (req, res) => {
    const claimId = req.params.id;
    console.log(`Fetching claim for editing with ID: ${claimId}`);

    try {
        const claim = await Claim.findById(claimId).exec();
        if (!claim) {
            console.error(`Claim with ID ${claimId} not found`);
            return res.status(404).render('404', { message: 'Claim not found' });
        }
        console.log(`Claim fetched for editing: ${claim}`);
        res.render('claims_edit', { title: 'Edit Claim', claim });
    } catch (err) {
        console.error(`Error fetching claim for editing: ${err}`);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

// Route to update a claim by ID, accessible by admin and manager
router.put('/:id', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Updated claim'), (req, res) => {
    const claimId = req.params.id;
    console.log(`Updating claim with ID: ${claimId}`);

    Claim.findById(claimId)
        .then(claim => {
            if (!claim) {
                console.error(`Claim with ID ${claimId} not found`);
                return res.status(404).json({ error: 'Claim not found' });
            }

            // Save the current version of the claim before updating
            claim.versions.push({
                description: claim.description,
                status: claim.status,
                files: claim.files,
                updatedAt: claim.updatedAt
            });

            // Update the claim with new data
            claim.mva = req.body.mva || claim.mva;
            claim.customerName = req.body.customerName || claim.customerName;
            claim.customerNumber = req.body.customerNumber || claim.customerNumber;
            claim.customerEmail = req.body.customerEmail || claim.customerEmail;
            claim.customerAddress = req.body.customerAddress || claim.customerAddress;
            claim.customerDriversLicense = req.body.customerDriversLicense || claim.customerDriversLicense;
            claim.carMake = req.body.carMake || claim.carMake;
            claim.carModel = req.body.carModel || claim.carModel;
            claim.carYear = req.body.carYear || claim.carYear;
            claim.carColor = req.body.carColor || claim.carColor;
            claim.carVIN = req.body.carVIN || claim.carVIN;
            claim.description = req.body.description || claim.description;
            claim.status = req.body.status || claim.status;
            claim.files = req.body.files || claim.files;

            // Save the updated claim to the database
            return claim.save();
        })
        .then(updatedClaim => {
            console.log('Claim updated:', updatedClaim);
            notifyClaimStatusUpdate(req.user.email, updatedClaim); // Send notification about the claim status update
            cache.del(`claim_${claimId}`); // Invalidate the cache for the updated claim
            cache.del('/claims'); // Invalidate the cache for claims list
            res.redirect('/dashboard'); // Redirect to the dashboard page
        })
        .catch(err => {
            console.error(`Error updating claim: ${err}`);
            res.status(500).json({ error: err.message }); // Handle errors
        });
});

// Route to delete a claim by ID, accessible only by admin
router.delete('/:id', ensureAuthenticated, ensureRole('admin'), logActivity('Deleted claim'), (req, res) => {
    const claimId = req.params.id;

    console.log('Deleting claim with ID:', claimId);

    Claim.findByIdAndDelete(claimId)
        .then(() => {
            console.log('Claim deleted:', claimId);
            res.json({ msg: 'Claim deleted' }); // Respond with deletion confirmation
            cache.del(`claim_${claimId}`); // Invalidate the cache for the deleted claim
            cache.del('/claims'); // Invalidate the cache for claims list
        })
        .catch(err => {
            console.error('Error deleting claim:', err);
            res.status(500).json({ error: err.message });
        }); // Handle errors
});

// Route for bulk updating claims, accessible by admin and manager
router.put('/bulk/update', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Bulk updated claims'), (req, res) => {
    const { claimIds, updateData } = req.body; // Extract claim IDs and update data from the request body

    console.log('Bulk updating claims with IDs:', claimIds, 'with data:', updateData);

    // Update multiple claims based on provided IDs and data
    Claim.updateMany({ _id: { $in: claimIds } }, updateData)
        .then(result => {
            console.log('Claims updated:', result);
            res.json({ msg: 'Claims updated', result }); // Respond with update result
            claimIds.forEach(id => cache.del(`claim_${id}`)); // Invalidate the cache for the updated claims
            cache.del('/claims'); // Invalidate the cache for claims list
        })
        .catch(err => {
            console.error('Error bulk updating claims:', err);
            res.status(500).json({ error: err.message });
        }); // Handle errors
});

// Route for bulk exporting claims, accessible by admin and manager
router.post('/bulk/export', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Bulk exported claims'), (req, res) => {
    const { claimIds, format } = req.body; // Extract claim IDs and export format from the request body

    console.log('Bulk exporting claims with IDs:', claimIds, 'in format:', format);

    // Find claims based on provided IDs
    Claim.find({ _id: { $in: claimIds } })
        .then(claims => {
            if (format === 'csv') {
                console.log('Exporting claims to CSV');
                res.csv(claims, true); // Export claims to CSV
            } else if (format === 'excel') {
                console.log('Exporting claims to Excel');
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Claims');
                worksheet.columns = [
                    { header: 'MVA', key: 'mva', width: 10 },
                    { header: 'Customer Name', key: 'customerName', width: 30 },
                    { header: 'Description', key: 'description', width: 50 },
                    { header: 'Status', key: 'status', width: 10 },
                    { header: 'Date', key: 'date', width: 15 }
                ];
                claims.forEach(claim => {
                    worksheet.addRow(claim);
                });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename=claims.xlsx');
                workbook.xlsx.write(res).then(() => res.end());
            } else if (format === 'pdf') {
                console.log('Exporting claims to PDF');
                const doc = new pdfkit();
                doc.pipe(res);
                doc.text('Claims Report', { align: 'center' });
                claims.forEach(claim => {
                    doc.text(`MVA: ${claim.mva}`);
                    doc.text(`Customer Name: ${claim.customerName}`);
                    doc.text(`Description: ${claim.description}`);
                    doc.text(`Status: ${claim.status}`);
                    doc.text(`Date: ${new Date(claim.date).toLocaleDateString()}`);
                    doc.moveDown();
                });
                doc.end();
            } else {
                console.error('Invalid export format:', format);
                res.status(400).json({ msg: 'Invalid format' });
            }
        })
        .catch(err => {
            console.error('Error exporting claims:', err);
            res.status(500).json({ error: err.message });
        }); // Handle errors
});

// Route to export a claim as PDF
router.get('/:id/export', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), async (req, res) => {
    const claimId = req.params.id;
    console.log('Exporting claim to PDF with ID:', claimId);

    try {
        const claim = await Claim.findById(claimId).exec();
        if (!claim) {
            console.error(`Claim with ID ${claimId} not found`);
            return res.status(404).render('404', { message: 'Claim not found' });
        }

        const doc = new pdfkit();
        const filename = `claim_${claimId}.pdf`;

        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/pdf');

        doc.pipe(res);

        doc.text('Claim Report', { align: 'center' });
        doc.text(`MVA: ${claim.mva}`);
        doc.text(`Customer Name: ${claim.customerName}`);
        doc.text(`Description: ${claim.description}`);
        doc.text(`Status: ${claim.status}`);
        doc.text(`Date: ${new Date(claim.date).toLocaleDateString()}`);
        doc.moveDown();

        doc.text('Files:');
        for (const file of claim.files) {
            doc.text(file);

            const filePath = path.join(__dirname, '../uploads', file);
            try {
                if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
                    doc.image(filePath, { fit: [250, 300], align: 'center' });
                } else {
                    doc.text('Unsupported file format for image preview.');
                }
            } catch (error) {
                console.error('Error adding image to PDF:', error);
                doc.text('Error loading image.');
            }
            doc.moveDown();
        }

        doc.end();
    } catch (err) {
        console.error('Error exporting claim to PDF:', err);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

// Route to view a specific claim by ID, with options to edit or delete, accessible by admin, manager, and employee
router.get('/:id', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), logActivity('Viewed claim details'), async (req, res) => {
    const claimId = req.params.id;
    console.log('Fetching claim details with ID:', claimId);

    try {
        const claim = await Claim.findById(claimId).exec();
        if (!claim) {
            console.error(`Claim with ID ${claimId} not found`);
            return res.status(404).render('404', { message: 'Claim not found' });
        }
        console.log(`Claim details fetched: ${claim}`);
        res.render('claim_view', { title: 'View Claim', claim });
    } catch (err) {
        console.error(`Error fetching claim details: ${err}`);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

module.exports = router; // Export the router
