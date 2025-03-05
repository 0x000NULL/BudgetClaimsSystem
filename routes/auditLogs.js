/**
 * @fileoverview This file defines the routes for handling audit logs in the Budget Claims System.
 * It includes routes to fetch, display, filter, and export audit logs, with authentication and role-checking middleware.
 * 
 * @module routes/auditLogs
 */

/**
 * Route to get and display audit logs with pagination and filtering.
 * 
 * @name get/
 * @function
 * @memberof module:routes/auditLogs
 * @inner
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @throws Will throw an error if there is an issue fetching audit logs from the database.
 * @middleware ensureAuthenticated - Middleware to ensure the user is authenticated.
 * @middleware ensureRoles - Middleware to ensure the user has the required roles ('admin' or 'manager').
 */
// Import necessary modules
const express = require('express'); // Import Express to create a router
const router = express.Router(); // Create a new router
const AuditLog = require('../models/AuditLog'); // Import the AuditLog model to interact with the audit logs collection in MongoDB
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware
const pinoLogger = require('../logger'); // Import Pino logger for proper logging
const csvExpress = require('csv-express'); // Import CSV export functionality
const ExcelJS = require('exceljs'); // Import Excel export functionality
const PDFDocument = require('pdfkit'); // Import PDF generation functionality

// Route to get and display audit logs with pagination and filtering
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        pinoLogger.info({
            message: 'Fetching audit logs',
            user: req.user.email,
            ip: req.ip
        });

        // Set default pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Build filter object based on query parameters
        const filter = {};
        
        // Filter by user if provided
        if (req.query.userId) {
            filter.user = req.query.userId;
        }
        
        // Filter by action if provided
        if (req.query.action) {
            filter.action = req.query.action;
        }
        
        // Filter by date range if provided
        if (req.query.startDate && req.query.endDate) {
            filter.timestamp = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        } else if (req.query.startDate) {
            filter.timestamp = { $gte: new Date(req.query.startDate) };
        } else if (req.query.endDate) {
            filter.timestamp = { $lte: new Date(req.query.endDate) };
        }

        // Count total matching logs for pagination
        const totalLogs = await AuditLog.countDocuments(filter);
        const totalPages = Math.ceil(totalLogs / limit);

        // Fetch audit logs with pagination and filters
        const logs = await AuditLog.find(filter)
            .populate({ path: 'user', select: 'username email' })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        pinoLogger.info({
            message: 'Audit logs fetched successfully',
            count: logs.length,
            page,
            totalPages,
            user: req.user.email
        });

        // Get unique actions for filter dropdown
        const uniqueActions = await AuditLog.distinct('action');

        // Render the audit_logs view with data
        res.render('audit_logs', {
            logs,
            pagination: {
                page,
                limit,
                totalPages,
                totalLogs
            },
            filters: {
                userId: req.query.userId || '',
                action: req.query.action || '',
                startDate: req.query.startDate || '',
                endDate: req.query.endDate || '',
                uniqueActions
            }
        });
    } catch (err) {
        pinoLogger.error({
            message: 'Error fetching audit logs',
            error: err.message,
            stack: err.stack,
            user: req.user ? req.user.email : 'Unknown'
        });

        // Render the error in the template rather than returning JSON
        res.status(500).render('error', {
            message: 'An error occurred while fetching audit logs.',
            error: process.env.NODE_ENV === 'development' ? err : {}
        });
    }
});

/**
 * Route to export audit logs as CSV.
 * 
 * @name get/export/csv
 * @function
 * @memberof module:routes/auditLogs
 * @inner
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @throws Will throw an error if there is an issue exporting audit logs.
 * @middleware ensureAuthenticated - Middleware to ensure the user is authenticated.
 * @middleware ensureRoles - Middleware to ensure the user has the required roles ('admin' or 'manager').
 */
router.get('/export/csv', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        pinoLogger.info({
            message: 'Exporting audit logs as CSV',
            user: req.user.email,
            ip: req.ip
        });

        // Build filter object based on query parameters (same as in the main route)
        const filter = {};
        
        if (req.query.userId) {
            filter.user = req.query.userId;
        }
        
        if (req.query.action) {
            filter.action = req.query.action;
        }
        
        if (req.query.startDate && req.query.endDate) {
            filter.timestamp = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        } else if (req.query.startDate) {
            filter.timestamp = { $gte: new Date(req.query.startDate) };
        } else if (req.query.endDate) {
            filter.timestamp = { $lte: new Date(req.query.endDate) };
        }

        // Fetch logs for export
        const logs = await AuditLog.find(filter)
            .populate({ path: 'user', select: 'username email' })
            .sort({ timestamp: -1 })
            .lean();

        // Transform data for CSV export
        const csvData = logs.map(log => ({
            Username: log.user ? log.user.username : 'Unknown',
            Email: log.user ? log.user.email : 'Unknown',
            Action: log.action,
            Details: log.details,
            Timestamp: new Date(log.timestamp).toLocaleString()
        }));

        // Set filename with current date
        const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        
        // Export as CSV
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.csv(csvData, true);
        
    } catch (err) {
        pinoLogger.error({
            message: 'Error exporting audit logs as CSV',
            error: err.message,
            stack: err.stack,
            user: req.user ? req.user.email : 'Unknown'
        });
        
        res.status(500).send('Error exporting audit logs as CSV');
    }
});

/**
 * Route to export audit logs as Excel.
 * 
 * @name get/export/excel
 * @function
 * @memberof module:routes/auditLogs
 * @inner
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @throws Will throw an error if there is an issue exporting audit logs.
 * @middleware ensureAuthenticated - Middleware to ensure the user is authenticated.
 * @middleware ensureRoles - Middleware to ensure the user has the required roles ('admin' or 'manager').
 */
router.get('/export/excel', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        pinoLogger.info({
            message: 'Exporting audit logs as Excel',
            user: req.user.email,
            ip: req.ip
        });

        // Build filter object (same as previous routes)
        const filter = {};
        
        if (req.query.userId) {
            filter.user = req.query.userId;
        }
        
        if (req.query.action) {
            filter.action = req.query.action;
        }
        
        if (req.query.startDate && req.query.endDate) {
            filter.timestamp = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        } else if (req.query.startDate) {
            filter.timestamp = { $gte: new Date(req.query.startDate) };
        } else if (req.query.endDate) {
            filter.timestamp = { $lte: new Date(req.query.endDate) };
        }

        // Fetch logs for export
        const logs = await AuditLog.find(filter)
            .populate({ path: 'user', select: 'username email' })
            .sort({ timestamp: -1 })
            .lean();

        // Create a new Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Audit Logs');
        
        // Add column headers
        worksheet.columns = [
            { header: 'Username', key: 'username', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Action', key: 'action', width: 20 },
            { header: 'Details', key: 'details', width: 50 },
            { header: 'Timestamp', key: 'timestamp', width: 20 }
        ];
        
        // Add style to the header row
        worksheet.getRow(1).font = { bold: true };
        
        // Add data rows
        logs.forEach(log => {
            worksheet.addRow({
                username: log.user ? log.user.username : 'Unknown',
                email: log.user ? log.user.email : 'Unknown',
                action: log.action,
                details: log.details,
                timestamp: new Date(log.timestamp).toLocaleString()
            });
        });
        
        // Set filename with current date
        const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Set headers and send file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Write to response
        await workbook.xlsx.write(res);
        res.end();
        
    } catch (err) {
        pinoLogger.error({
            message: 'Error exporting audit logs as Excel',
            error: err.message,
            stack: err.stack,
            user: req.user ? req.user.email : 'Unknown'
        });
        
        res.status(500).send('Error exporting audit logs as Excel');
    }
});

/**
 * Route to export audit logs as PDF.
 * 
 * @name get/export/pdf
 * @function
 * @memberof module:routes/auditLogs
 * @inner
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @throws Will throw an error if there is an issue exporting audit logs.
 * @middleware ensureAuthenticated - Middleware to ensure the user is authenticated.
 * @middleware ensureRoles - Middleware to ensure the user has the required roles ('admin' or 'manager').
 */
router.get('/export/pdf', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        pinoLogger.info({
            message: 'Exporting audit logs as PDF',
            user: req.user.email,
            ip: req.ip
        });

        // Build filter object (same as previous routes)
        const filter = {};
        
        if (req.query.userId) {
            filter.user = req.query.userId;
        }
        
        if (req.query.action) {
            filter.action = req.query.action;
        }
        
        if (req.query.startDate && req.query.endDate) {
            filter.timestamp = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        } else if (req.query.startDate) {
            filter.timestamp = { $gte: new Date(req.query.startDate) };
        } else if (req.query.endDate) {
            filter.timestamp = { $lte: new Date(req.query.endDate) };
        }

        // Fetch logs for export (limit to 1000 for PDF performance)
        const logs = await AuditLog.find(filter)
            .populate({ path: 'user', select: 'username email' })
            .sort({ timestamp: -1 })
            .limit(1000)
            .lean();

        // Set filename with current date
        const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);
        
        // Add title and date
        doc.fontSize(20).text('Audit Logs Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);
        
        // Define table layout
        const tableTop = 150;
        const colWidths = [100, 100, 150, 150];
        let rowTop = tableTop;
        
        // Add table headers
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Username', 50, rowTop);
        doc.text('Action', 150, rowTop);
        doc.text('Details', 250, rowTop);
        doc.text('Timestamp', 400, rowTop);
        
        rowTop += 20;
        doc.font('Helvetica');
        
        // Add table rows
        logs.forEach((log, i) => {
            // Add a new page if we're at the bottom
            if (rowTop > 700) {
                doc.addPage();
                rowTop = 50;
            }
            
            // Add log data
            doc.text(log.user ? log.user.username : 'Unknown', 50, rowTop);
            doc.text(log.action, 150, rowTop);
            
            // Truncate details if too long
            const details = log.details ? 
                (log.details.length > 30 ? log.details.substring(0, 30) + '...' : log.details) : 
                '';
            doc.text(details, 250, rowTop);
            
            doc.text(new Date(log.timestamp).toLocaleString(), 400, rowTop);
            
            rowTop += 20;
        });
        
        // Finalize PDF
        doc.end();
        
    } catch (err) {
        pinoLogger.error({
            message: 'Error exporting audit logs as PDF',
            error: err.message,
            stack: err.stack,
            user: req.user ? req.user.email : 'Unknown'
        });
        
        res.status(500).send('Error exporting audit logs as PDF');
    }
});

module.exports = router; // Export the router
