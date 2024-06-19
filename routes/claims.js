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

// Route to get all claims or filter claims based on query parameters, accessible by admin, manager, and employee
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), logActivity('Viewed claims list'), async (req, res) => {
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
    console.log('Fetching claims with query:', filter); // Debug log for query parameters

    try {
        // Attempt to get the cached data
        const cachedClaims = await cache.get(cacheKey);
        if (cachedClaims) {
            console.log('Returning cached claims data:', cachedClaims); // Debug log for cached data
            return res.render('claims_search', { claims: cachedClaims }); // Render the claims search view with cached data
        }

        // If no cached data, fetch claims from the database
        const claims = await Claim.find(filter).exec();
        console.log('Claims fetched from database:', claims); // Debug log for fetched data

        // Cache the fetched data
        await cache.set(cacheKey, claims);
        console.log('Claims data cached with key:', cacheKey); // Debug log for caching

        // Render the claims search view with fetched data
        res.render('claims_search', { claims });
    } catch (err) {
        console.error('Error fetching claims:', err); // Debug log for errors
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// Route to add a new claim, accessible by admin and manager
router.post('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Added new claim'), (req, res) => {
    const { mva, customerName, description, status } = req.body; // Extract claim details from the request body
    console.log('Adding new claim with data:', req.body); // Debug log for claim data

    // Initialize an array to hold uploaded file names
    let filesArray = [];

    // Check if files were uploaded
    if (req.files) {
        const files = req.files.files;
        if (!Array.isArray(files)) filesArray.push(files); // Ensure files is always an array
        else filesArray = files;

        // Save each file to the uploads directory
        filesArray.forEach(file => {
            const filePath = path.join(__dirname, '../uploads', file.name);
            file.mv(filePath, err => {
                if (err) {
                    console.error('File upload error:', err); // Debug log for file upload error
                    return res.status(500).json({ error: err.message }); // Handle file upload error
                }
                console.log('File uploaded successfully:', file.name); // Debug log for successful upload
            });
        });
    }

    // Create a new claim object
    const newClaim = new Claim({
        mva,
        customerName,
        description,
        status,
        files: filesArray.map(file => file.name) // Store file names in the claim
    });

    // Save the claim to the database
    newClaim.save()
        .then(claim => {
            console.log('New claim added:', claim); // Debug log for added claim
            res.json(claim); // Respond with the saved claim
            notifyNewClaim(req.user.email, claim); // Send notification about the new claim
            cache.del('/claims'); // Invalidate the cache for claims list
        })
        .catch(err => {
            console.error('Error adding claim:', err); // Debug log for error
            res.status(500).json({ error: err.message }); // Handle errors
        });
});

// Route to get a specific claim by ID, accessible by admin, manager, and employee
router.get('/:id', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), logActivity('Viewed claim details'), async (req, res) => {
    const cacheKey = `claim_${req.params.id}`; // Create a cache key based on the claim ID
    console.log('Fetching claim with ID:', req.params.id); // Debug log for claim ID

    try {
        // Attempt to get the cached data
        const cachedClaim = await cache.get(cacheKey);
        if (cachedClaim) {
            console.log('Returning cached claim data:', cachedClaim); // Debug log for cached data
            return res.json(cachedClaim); // Respond with cached data
        }

        // If no cached data, fetch the claim from the database
        const claim = await Claim.findById(req.params.id).exec();
        if (!claim) {
            console.log('Claim not found:', req.params.id); // Debug log for not found
            return res.status(404).json({ msg: 'Claim not found' }); // Handle case where claim is not found
        }
        console.log('Claim fetched from database:', claim); // Debug log for fetched data

        // Cache the fetched data
        await cache.set(cacheKey, claim);
        console.log('Claim data cached with key:', cacheKey); // Debug log for caching

        // Respond with the fetched data
        res.json(claim);
    } catch (err) {
        console.error('Error fetching claim:', err); // Debug log for errors
        res.status(500).json({ error: err.message }); // Handle errors
    }
});

// Route to update a claim by ID, accessible by admin and manager
router.post('/edit/:id', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Updated claim'), async (req, res) => {
    try {
        let claim = await Claim.findById(req.params.id).exec();
        if (!claim) {
            console.log('Claim not found:', req.params.id); // Debug log for not found
            return res.status(404).json({ msg: 'Claim not found' });
        }

        console.log('Updating claim with data:', req.body); // Debug log for claim data

        // Update claim details
        claim.mva = req.body.mva;
        claim.customerName = req.body.customerName;
        claim.description = req.body.description;
        claim.status = req.body.status;

        // Handle file uploads if any
        if (req.files && req.files.files) {
            let filesArray = req.files.files;
            if (!Array.isArray(filesArray)) {
                filesArray = [filesArray];
            }

            filesArray.forEach(file => {
                const filePath = path.join(__dirname, '../uploads', file.name);
                file.mv(filePath, err => {
                    if (err) {
                        console.error('File upload error:', err); // Debug log for file upload error
                        return res.status(500).json({ error: err.message }); // Handle file upload error
                    }
                    console.log('File uploaded successfully:', file.name); // Debug log for successful upload
                });
                claim.files.push(file.name); // Add the new file to the claim's files array
            });
        }

        claim = await claim.save();
        console.log('Claim updated:', claim); // Debug log for updated claim
        cache.del(`claim_${req.params.id}`); // Invalidate cache for the updated claim
        cache.del('/claims'); // Invalidate cache for claims list
        res.redirect('/claims');
    } catch (err) {
        console.error('Error updating claim:', err); // Debug log for errors
        res.status(500).json({ error: err.message });
    }
});

// Route to delete a claim by ID, accessible only by admin
router.delete('/:id', ensureAuthenticated, ensureRole('admin'), logActivity('Deleted claim'), (req, res) => {
    Claim.findByIdAndDelete(req.params.id)
        .then(() => {
            console.log('Claim deleted:', req.params.id); // Debug log for deleted claim
            res.json({ msg: 'Claim deleted' }); // Respond with deletion confirmation
            cache.del(`claim_${req.params.id}`); // Invalidate the cache for the deleted claim
            cache.del('/claims'); // Invalidate the cache for claims list
        })
        .catch(err => {
            console.error('Error deleting claim:', err); // Debug log for errors
            res.status(500).json({ error: err.message });
        });
});

// Route for bulk updating claims, accessible by admin and manager
router.put('/bulk/update', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Bulk updated claims'), (req, res) => {
    const { claimIds, updateData } = req.body; // Extract claim IDs and update data from the request body
    console.log('Bulk updating claims with IDs:', claimIds, 'and data:', updateData); // Debug log for bulk update

    // Update multiple claims based on provided IDs and data
    Claim.updateMany({ _id: { $in: claimIds } }, updateData)
        .then(result => {
            console.log('Claims bulk updated:', result); // Debug log for bulk update result
            res.json({ msg: 'Claims updated', result }); // Respond with update result
            claimIds.forEach(id => cache.del(`claim_${id}`)); // Invalidate the cache for the updated claims
            cache.del('/claims'); // Invalidate the cache for claims list
        })
        .catch(err => {
            console.error('Error bulk updating claims:', err); // Debug log for errors
            res.status(500).json({ error: err.message });
        });
});

// Route for bulk exporting claims, accessible by admin and manager
router.post('/bulk/export', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Bulk exported claims'), (req, res) => {
    const { claimIds, format } = req.body; // Extract claim IDs and export format from the request body
    console.log('Bulk exporting claims with IDs:', claimIds, 'and format:', format); // Debug log for bulk export

    // Find claims based on provided IDs
    Claim.find({ _id: { $in: claimIds } })
        .then(claims => {
            if (format === 'csv') {
                res.csv(claims, true); // Export claims to CSV
            } else if (format === 'excel') {
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
                res.status(400).json({ msg: 'Invalid format' });
            }
        })
        .catch(err => {
            console.error('Error bulk exporting claims:', err); // Debug log for errors
            res.status(500).json({ error: err.message });
        });
});

// Route to search for claims, accessible by admin, manager, and employee
router.get('/search', ensureAuthenticated, ensureRoles(['admin', 'manager', 'employee']), (req, res) => {
    const { mva, customerName, status, startDate, endDate } = req.query; // Extract query parameters
    console.log('Searching claims with query:', req.query); // Debug log for query parameters

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
            console.log('Claims search result:', claims); // Debug log for search result
            res.render('claims_search', { claims }); // Respond with filtered claims
        })
        .catch(err => {
            console.error('Error searching claims:', err); // Debug log for errors
            res.status(500).json({ error: err.message });
        });
});

module.exports = router; // Export the router
