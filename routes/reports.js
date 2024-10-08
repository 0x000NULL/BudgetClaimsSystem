/**
 * @fileoverview This module defines routes for generating and downloading reports in various formats (CSV, Excel, PDF) 
 * for the Budget Claims System. It includes middleware for authentication, role-checking, and activity logging.
 * 
 * @module routes/reports
 */

 /**
 * Filters out sensitive fields from the request body.
 * 
 * @function filterSensitiveData
 * @param {Object} data - The data object to be filtered.
 * @returns {Object} The filtered data object with sensitive fields masked.
 */

 /**
 * Logs requests with user and session information.
 * 
 * @function logRequest
 * @param {Object} req - The Express request object.
 * @param {string} message - The log message.
 * @param {Object} [extra={}] - Additional information to log.
 */

 /**
 * Route to render the reports page.
 * Only accessible to authenticated users with 'admin' or 'manager' roles.
 * 
 * @name GET /
 * @function
 * @memberof module:routes/reports
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */

 /**
 * Route to generate and download reports in various formats (CSV, Excel, PDF).
 * Only accessible to authenticated users with 'admin' or 'manager' roles.
 * 
 * @name POST /generate
 * @function
 * @memberof module:routes/reports
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>}
 */
const express = require('express'); // Import Express to create a router
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware
const logActivity = require('../middleware/activityLogger'); // Import activity logging middleware
const ExcelJS = require('exceljs'); // Import ExcelJS for Excel export
const pdfkit = require('pdfkit'); // Import PDFKit for PDF export
const csv = require('csv-express'); // Import csv-express for CSV export
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

// Route to render the reports page
// Only accessible to authenticated users with 'admin' or 'manager' roles
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), (req, res) => {
    logRequest(req, 'Reports route accessed');
    res.render('reports', { title: 'Reports - Budget Claims System' }); // Render the reports page
});

// Route to generate and download reports in various formats (CSV, Excel, PDF)
// Only accessible to authenticated users with 'admin' or 'manager' roles
router.post('/generate', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const { format, startDate, endDate } = req.body; // Extract report parameters from the request body
    logRequest(req, 'Generating report with parameters:', { format, startDate, endDate });

    // Build a filter object based on the provided date range
    let filter = {};
    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate); // Set the start date filter
        if (endDate) filter.date.$lte = new Date(endDate); // Set the end date filter
    }

    try {
        // Fetch claims from the database based on the filter
        const claims = await Claim.find(filter).exec();
        logRequest(req, 'Claims fetched for report:', { claims });

        if (format === 'csv') {
            // Export claims to CSV
            logRequest(req, 'Exporting claims to CSV');
            res.csv(claims, true); // Send CSV response
        } else if (format === 'excel') {
            // Export claims to Excel
            logRequest(req, 'Exporting claims to Excel');
            const workbook = new ExcelJS.Workbook(); // Create a new workbook
            const worksheet = workbook.addWorksheet('Claims'); // Add a worksheet to the workbook
            worksheet.columns = [
                { header: 'MVA', key: 'mva', width: 10 },
                { header: 'Customer Name', key: 'customerName', width: 30 },
                { header: 'Description', key: 'description', width: 50 },
                { header: 'Status', key: 'status', width: 10 },
                { header: 'Date', key: 'date', width: 15 }
            ]; // Define worksheet columns
            claims.forEach(claim => {
                worksheet.addRow(claim); // Add each claim as a row in the worksheet
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=claims.xlsx');
            await workbook.xlsx.write(res); // Write the workbook to the response
            res.end(); // End the response
        } else if (format === 'pdf') {
            // Export claims to PDF
            logRequest(req, 'Exporting claims to PDF');
            const doc = new pdfkit(); // Create a new PDF document
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=claims.pdf');
            doc.pipe(res); // Pipe the PDF document to the response
            doc.text('Claims Report', { align: 'center' }); // Add a title to the PDF
            claims.forEach(claim => {
                doc.text(`MVA: ${claim.mva}`);
                doc.text(`Customer Name: ${claim.customerName}`);
                doc.text(`Description: ${claim.description}`);
                doc.text(`Status: ${claim.status}`);
                doc.text(`Date: ${new Date(claim.date).toLocaleDateString()}`);
                doc.moveDown(); // Add space between claims
            });
            doc.end(); // Finalize the PDF document
        } else {
            logRequest(req, 'Invalid report format:', { format });
            res.status(400).json({ msg: 'Invalid format' }); // Respond with an error for invalid formats
        }
    } catch (err) {
        logRequest(req, 'Error generating report:', { error: err });
        res.status(500).json({ error: err.message }); // Respond with an error for any exceptions
    }
});

module.exports = router; // Export the router
