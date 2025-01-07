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
const express = require('express');
const router = express.Router();
const Claim = require('../models/Claim');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const multer = require('multer');
const upload = multer();
const csv = require('csv-express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// GET /reports - Render reports page
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), (req, res) => {
    res.render('reports', { 
        title: 'Reports',
        user: req.user
    });
});

router.post('/generate', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        console.log('Report generation started');
        console.log('Request body:', req.body);
        
        const { reportType, dateRange, startDate, endDate } = req.body;
        console.log('Parameters:', { reportType, dateRange, startDate, endDate });
        
        // Build query based on date range
        let query = {};
        if (dateRange === 'custom') {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        console.log('MongoDB query:', query);

        // Fetch claims based on query
        console.log('Fetching claims from database...');
        const claims = await Claim.find(query)
            .populate('status', 'name')
            .sort({ createdAt: -1 });
        console.log(`Found ${claims.length} claims`);
        
        // Log first claim as sample
        if (claims.length > 0) {
            console.log('Sample claim data:', {
                mva: claims[0].mva,
                customerName: claims[0].customerName,
                description: claims[0].description,
                status: claims[0].status,
                date: claims[0].date,
                damagesTotal: claims[0].damagesTotal
            });
        }

        // Define columns to match existing format
        const columns = [
            { header: 'mva', key: 'mva' },
            { header: 'customerName', key: 'customerName' },
            { header: 'description', key: 'description' },
            { header: 'status', key: 'status._id' },
            { header: 'date', key: 'date' },
            { header: 'amount', key: 'damagesTotal' }
        ];
        console.log('Using columns:', columns);

        switch (reportType) {
            case 'csv':
                console.log('Generating CSV report...');
                const csvData = claims.map(claim => {
                    const row = {
                        mva: claim.mva || '',
                        customerName: claim.customerName || '',
                        description: claim.description || '',
                        status: claim.status?._id || '',
                        date: claim.date ? new Date(claim.date).toLocaleDateString() : '',
                        amount: claim.damagesTotal || 0
                    };
                    return row;
                });
                console.log('CSV data sample:', csvData[0]);
                res.csv(csvData, true);
                console.log('CSV report sent successfully');
                break;

            case 'excel':
                console.log('Generating Excel report...');
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Claims');
                
                // Add headers
                worksheet.columns = columns.map(col => ({
                    header: col.header,
                    key: col.key,
                    width: 15
                }));
                console.log('Excel headers added');

                // Add data
                claims.forEach((claim, index) => {
                    const row = {
                        mva: claim.mva || '',
                        customerName: claim.customerName || '',
                        description: claim.description || '',
                        status: claim.status?._id || '',
                        date: claim.date ? new Date(claim.date).toLocaleDateString() : '',
                        amount: claim.damagesTotal || 0
                    };
                    worksheet.addRow(row);
                    if (index === 0) console.log('First Excel row:', row);
                });
                console.log(`Added ${claims.length} rows to Excel`);

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename=claims-report.xlsx');
                await workbook.xlsx.write(res);
                console.log('Excel report sent successfully');
                break;

            case 'pdf':
                console.log('Generating PDF report...');
                const doc = new PDFDocument();
                doc.pipe(res);

                // Add title
                doc.fontSize(16).text('Claims Report', { align: 'center' });
                doc.moveDown();
                console.log('PDF title added');

                // Add headers
                const headers = columns.map(col => col.header);
                doc.fontSize(10).text(headers.join(', '));
                doc.moveDown();
                console.log('PDF headers added');

                // Add each claim
                claims.forEach((claim, index) => {
                    const row = [
                        claim.mva || '',
                        claim.customerName || '',
                        claim.description || '',
                        claim.status?._id || '',
                        claim.date ? new Date(claim.date).toLocaleDateString() : '',
                        claim.damagesTotal || 0
                    ];
                    doc.text(row.join(', '));
                    if (index === 0) console.log('First PDF row:', row);
                });
                console.log(`Added ${claims.length} rows to PDF`);

                doc.end();
                console.log('PDF report sent successfully');
                break;

            default:
                console.error('Invalid report type:', reportType);
                throw new Error('Invalid report type');
        }

    } catch (error) {
        console.error('Report generation error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).send('Error generating report');
    }
});

module.exports = router;
