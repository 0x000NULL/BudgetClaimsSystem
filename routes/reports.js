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

 /**
 * Route to handle report preview
 * Only accessible to authenticated users with 'admin' or 'manager' roles.
 * 
 * @name POST /preview
 * @function
 * @memberof module:routes/reports
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>}
 */
const express = require('express'); // Import Express to create a router
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const LiabilityClaim = require('../models/LiabilityClaim');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware
const logActivity = require('../middleware/activityLogger'); // Import activity logging middleware
const ExcelJS = require('exceljs'); // Import ExcelJS for Excel export
const PDFDocument = require('pdfkit'); // Import PDFKit for PDF export
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

// Helper function to format data for different output types
function formatDataForOutput(claims, fields) {
    return claims.map(claim => {
        const formattedClaim = {};
        fields.forEach(field => {
            // Handle nested fields
            if (field.includes('.')) {
                const [parent, child] = field.split('.');
                formattedClaim[field] = claim[parent]?.[child] || '';
            } else if (field === 'invoiceTotals') {
                // Calculate total of all invoices
                const total = claim.invoiceTotals?.reduce((sum, invoice) => sum + (invoice.total || 0), 0) || 0;
                formattedClaim[field] = `$${total.toFixed(2)}`;
            } else if (field === 'adminFee') {
                // Format admin fee as currency
                formattedClaim[field] = `$${(claim.adminFee || 0).toFixed(2)}`;
            } else {
                // Handle regular fields
                let value = claim[field];
                // Format currency values
                if (['damagesTotal'].includes(field) && typeof value === 'number') {
                    value = `$${value.toFixed(2)}`;
                }
                formattedClaim[field] = value || '';
            }
        });
        return formattedClaim;
    });
}

// Helper function to build MongoDB query from filters
function buildQueryFromFilters(filters) {
    const query = {};
    
    filters.forEach(filter => {
        const { field, operator, value } = filter;
        
        // Handle special fields
        if (['invoiceTotals', 'adminFee', 'damagesTotal'].includes(field)) {
            // Remove currency symbol and convert to number for comparison
            const numericValue = parseFloat(value.replace(/[$,]/g, ''));
            
            switch (operator) {
                case 'equals':
                    query[field === 'invoiceTotals' ? 'invoiceTotals.total' : field] = numericValue;
                    break;
                case 'greaterThan':
                    query[field === 'invoiceTotals' ? 'invoiceTotals.total' : field] = { $gt: numericValue };
                    break;
                case 'lessThan':
                    query[field === 'invoiceTotals' ? 'invoiceTotals.total' : field] = { $lt: numericValue };
                    break;
                case 'between':
                    const [start, end] = value.split(',').map(v => parseFloat(v.replace(/[$,]/g, '')));
                    query[field === 'invoiceTotals' ? 'invoiceTotals.total' : field] = { $gte: start, $lte: end };
                    break;
            }
        } else {
            switch (operator) {
                case 'equals':
                    query[field] = value;
                    break;
                case 'contains':
                    query[field] = { $regex: value, $options: 'i' };
                    break;
                case 'greaterThan':
                    query[field] = { $gt: value };
                    break;
                case 'lessThan':
                    query[field] = { $lt: value };
                    break;
                case 'between':
                    const [start, end] = value.split(',').map(v => v.trim());
                    query[field] = { $gte: start, $lte: end };
                    break;
            }
        }
    });
    
    return query;
}

// Route to display the report builder page
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), (req, res) => {
    res.render('reports', { 
        title: 'Report Builder - Budget Claims System',
        user: req.user
    });
});

// Route to handle report generation
router.post('/generate', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        // Parse the JSON strings from form data
        const fields = JSON.parse(req.body.fields);
        const filters = req.body.filters ? JSON.parse(req.body.filters) : [];
        const format = req.body.format;
        
        console.log('Received report generation request:', { fields, filters, format });
        
        // Validate required fields
        if (!fields || !Array.isArray(fields) || fields.length === 0) {
            console.error('Invalid fields:', fields);
            return res.status(400).json({ error: 'At least one field must be selected' });
        }
        
        // Build query from filters
        const query = filters ? buildQueryFromFilters(filters) : {};
        console.log('Built query:', query);
        
        // Fetch claims based on query
        const claims = await Claim.find(query).lean();
        const liabilityClaims = await LiabilityClaim.find(query).lean();
        const allClaims = [...claims, ...liabilityClaims];
        
        console.log('Found claims:', allClaims.length);
        
        // Format data for output
        const formattedData = formatDataForOutput(allClaims, fields);
        console.log('Formatted data:', formattedData);
        
        // Generate report based on selected format
        switch (format) {
            case 'csv':
                res.csv(formattedData, true);
                break;
                
            case 'excel':
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Claims Report');
                
                // Add headers
                worksheet.columns = fields.map(field => ({
                    header: field.split('.').pop().replace(/([A-Z])/g, ' $1').trim(),
                    key: field,
                    width: 20
                }));
                
                // Add data
                formattedData.forEach(row => {
                    worksheet.addRow(row);
                });
                
                // Set response headers
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename=claims-report.xlsx');
                
                // Write to response
                await workbook.xlsx.write(res);
                res.end();
                break;
                
            case 'pdf':
                const doc = new PDFDocument();
                
                // Set response headers
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename=claims-report.pdf');
                
                // Pipe PDF to response
                doc.pipe(res);
                
                // Add title
                doc.fontSize(20).text('Claims Report', { align: 'center' });
                doc.moveDown();
                
                // Add date
                doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });
                doc.moveDown();
                
                // Add table headers
                const tableHeaders = fields.map(field => 
                    field.split('.').pop().replace(/([A-Z])/g, ' $1').trim()
                );
                
                // Calculate column widths
                const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
                const columnWidth = pageWidth / fields.length;
                
                // Draw table headers
                doc.font('Helvetica-Bold');
                tableHeaders.forEach((header, i) => {
                    doc.text(header, doc.page.margins.left + (i * columnWidth), doc.y, {
                        width: columnWidth,
                        align: 'left'
                    });
                });
                
                // Draw table rows
                doc.font('Helvetica');
                formattedData.forEach(row => {
                    doc.moveDown();
                    fields.forEach((field, i) => {
                        doc.text(String(row[field] || ''), 
                            doc.page.margins.left + (i * columnWidth), 
                            doc.y, {
                                width: columnWidth,
                                align: 'left'
                            });
                    });
                });
                
                // Finalize PDF
                doc.end();
                break;
                
            default:
                console.error('Invalid format specified:', format);
                return res.status(400).json({ error: 'Invalid format specified' });
        }
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report: ' + error.message });
    }
});

// Route to handle report preview
router.post('/preview', ensureAuthenticated, ensureRoles(['admin', 'manager']), express.json(), async (req, res) => {
    try {
        const { fields, filters, format } = req.body;
        
        console.log('Received preview request:', { fields, filters, format });
        
        // Validate required fields
        if (!fields || !Array.isArray(fields) || fields.length === 0) {
            console.error('Invalid fields:', fields);
            return res.status(400).json({ error: 'At least one field must be selected' });
        }
        
        // Build query from filters
        const query = filters ? buildQueryFromFilters(filters) : {};
        console.log('Built query:', query);
        
        // Fetch a limited number of claims for preview
        const claims = await Claim.find(query).limit(5).lean();
        const liabilityClaims = await LiabilityClaim.find(query).limit(5).lean();
        const allClaims = [...claims, ...liabilityClaims];
        
        console.log('Found claims:', allClaims.length);
        
        // Format data for preview
        const formattedData = formatDataForOutput(allClaims, fields);
        console.log('Formatted data:', formattedData);
        
        // Generate preview HTML
        let previewHtml = `
            <h4>Preview Data (First 5 Records)</h4>
            <div class="preview-table">
                <table>
                    <thead>
                        <tr>
                            ${fields.map(field => `
                                <th>${field.split('.').pop().replace(/([A-Z])/g, ' $1').trim()}</th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${formattedData.map(row => `
                            <tr>
                                ${fields.map(field => `
                                    <td>${row[field] || ''}</td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="preview-summary">
                <p><strong>Total Records:</strong> ${allClaims.length}</p>
                <p><strong>Selected Fields:</strong> ${fields.join(', ')}</p>
                ${filters && filters.length > 0 ? `
                    <p><strong>Filters Applied:</strong></p>
                    <ul>
                        ${filters.map(filter => `
                            <li>${filter.field} ${filter.operator} ${filter.value}</li>
                        `).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
        
        res.send(previewHtml);
    } catch (error) {
        console.error('Error generating preview:', error);
        res.status(500).send(`
            <div class="error-message">
                <h4>Error Generating Preview</h4>
                <p>${error.message}</p>
            </div>
        `);
    }
});

module.exports = router; // Export the router
