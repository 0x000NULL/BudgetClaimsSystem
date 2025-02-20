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
        console.log('\n=== Report Generation Started ===');
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
        console.log('\n=== Fetching Claims ===');
        const claims = await Claim.find(query)
            .populate({
                path: 'status',
                select: 'name color'
            })
            .sort({ createdAt: -1 });
        
        console.log('\n=== Claims Data ===');
        console.log('Total claims found:', claims.length);
        
        if (claims.length > 0) {
            const firstClaim = claims[0];
            console.log('\nFirst Claim Details:');
            console.log('- Full claim:', JSON.stringify(firstClaim, null, 2));
            console.log('- Status field:', firstClaim.status);
            console.log('- Status type:', typeof firstClaim.status);
            console.log('- Status name:', firstClaim.status?.name);
            console.log('- Status ID:', firstClaim.status?._id);
            
            // Test if status is populated
            console.log('\nStatus Population Check:');
            console.log('- Is status defined?:', !!firstClaim.status);
            console.log('- Is status an object?:', typeof firstClaim.status === 'object');
            console.log('- Is status null?:', firstClaim.status === null);
            console.log('- Status constructor:', firstClaim.status?.constructor?.name);
        }

        // Helper function to format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(amount || 0);
        };

        // Helper function to format notes more concisely
        const formatNotes = (notes) => {
            if (!notes || !Array.isArray(notes)) return '';
            // Get the most recent note only
            const latestNote = notes.sort((a, b) => b.createdAt - a.createdAt)[0];
            return latestNote ? latestNote.content : '';
        };

        switch (reportType) {
            case 'csv':
                console.log('Generating CSV report...');
                const csvData = claims.map(claim => ({
                    'MVA #': claim.mva || '',
                    'Customer Name': claim.customerName || '',
                    'Latest Note': formatNotes(claim.notes),
                    'Status': claim.status?.name || 'Unknown',
                    'Date': claim.date ? new Date(claim.date).toLocaleDateString() : '',
                    'Amount': formatCurrency(claim.damagesTotal)
                }));
                res.csv(csvData, true);
                break;

            case 'excel':
                console.log('Generating Excel report...');
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Claims');
                
                // Style the headers
                worksheet.columns = [
                    { header: 'MVA #', key: 'mva', width: 15 },
                    { header: 'Customer Name', key: 'customerName', width: 25 },
                    { header: 'Latest Note', key: 'notes', width: 40 },
                    { header: 'Status', key: 'status', width: 15 },
                    { header: 'Date', key: 'date', width: 15 },
                    { header: 'Amount', key: 'amount', width: 15 }
                ];

                // Style the header row
                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' }
                };

                // Add data
                claims.forEach(claim => {
                    worksheet.addRow({
                        mva: claim.mva || '',
                        customerName: claim.customerName || '',
                        notes: formatNotes(claim.notes),
                        status: claim.status?.name || 'Unknown',
                        date: claim.date ? new Date(claim.date).toLocaleDateString() : '',
                        amount: formatCurrency(claim.damagesTotal)
                    });
                });

                // Auto-fit columns
                worksheet.columns.forEach(column => {
                    column.alignment = { wrapText: true };
                });

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename=claims-report.xlsx');
                await workbook.xlsx.write(res);
                break;

            case 'pdf':
                console.log('Generating PDF report...');
                const doc = new PDFDocument({ margin: 50 });
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename=claims-report.pdf');
                doc.pipe(res);

                // Add title
                doc.fontSize(18).text('Claims Report', { align: 'center' });
                doc.moveDown(2);

                // Define table layout
                const tableTop = 150;
                const rowHeight = 30;
                let currentY = tableTop;

                // Draw table headers
                doc.fontSize(10).font('Helvetica-Bold');
                const headers = ['MVA #', 'Customer Name', 'Latest Note', 'Status', 'Date', 'Amount'];
                const colWidths = [60, 100, 180, 70, 70, 70];
                let currentX = 50;

                headers.forEach((header, i) => {
                    doc.text(header, currentX, currentY, { width: colWidths[i] });
                    currentX += colWidths[i];
                });

                // Draw rows
                currentY += rowHeight;
                doc.font('Helvetica');

                claims.forEach((claim, index) => {
                    if (currentY > 700) { // Start new page if near bottom
                        doc.addPage();
                        currentY = 50;
                    }

                    currentX = 50;
                    const rowData = [
                        claim.mva || '',
                        claim.customerName || '',
                        formatNotes(claim.notes),
                        claim.status?.name || 'Unknown',
                        claim.date ? new Date(claim.date).toLocaleDateString() : '',
                        formatCurrency(claim.damagesTotal)
                    ];

                    rowData.forEach((text, i) => {
                        doc.text(text, currentX, currentY, {
                            width: colWidths[i],
                            height: rowHeight,
                            ellipsis: true
                        });
                        currentX += colWidths[i];
                    });

                    currentY += rowHeight;
                });

                doc.end();
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
