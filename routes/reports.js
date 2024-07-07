const express = require('express'); // Import Express to create a router
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware
const logActivity = require('../middleware/activityLogger'); // Import activity logging middleware
const ExcelJS = require('exceljs'); // Import ExcelJS for Excel export
const pdfkit = require('pdfkit'); // Import PDFKit for PDF export
const csv = require('csv-express'); // Import csv-express for CSV export

const router = express.Router(); // Create a new router

// Route to render the reports page
// Only accessible to authenticated users with 'admin' or 'manager' roles
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), (req, res) => {
    console.log('Reports route accessed');
    res.render('reports', { title: 'Reports - Budget Claims System' }); // Render the reports page
});

// Route to generate and download reports in various formats (CSV, Excel, PDF)
// Only accessible to authenticated users with 'admin' or 'manager' roles
router.post('/generate', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    const { format, startDate, endDate } = req.body; // Extract report parameters from the request body
    console.log('Generating report with parameters:', { format, startDate, endDate });

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
        console.log('Claims fetched for report:', claims);

        if (format === 'csv') {
            // Export claims to CSV
            res.csv(claims, true); // Send CSV response
        } else if (format === 'excel') {
            // Export claims to Excel
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
            res.status(400).json({ msg: 'Invalid format' }); // Respond with an error for invalid formats
        }
    } catch (err) {
        console.error('Error generating report:', err);
        res.status(500).json({ error: err.message }); // Respond with an error for any exceptions
    }
});

module.exports = router; // Export the router
