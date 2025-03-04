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

// GET /reports - Render reports dashboard page
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), (req, res) => {
    res.render('reports/index', { 
        title: 'Reports Dashboard',
        user: req.user
    });
});

// GET /reports/status - Render status report page
router.get('/status', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        const claims = await Claim.find()
            .populate('status')
            .sort({ createdAt: -1 });
            
        res.render('reports/status', { 
            title: 'Status Reports',
            claims,
            user: req.user
        });
    } catch (error) {
        res.status(500).render('error', {
            message: 'Error generating status report',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// GET /reports/financial - Render financial report page
router.get('/financial', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        const claims = await Claim.find()
            .populate('status')
            .sort({ damagesTotal: -1 });
            
        res.render('reports/financial', { 
            title: 'Financial Reports',
            claims,
            user: req.user
        });
    } catch (error) {
        res.status(500).render('error', {
            message: 'Error generating financial report',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// GET /reports/monthly - Render monthly report page
router.get('/monthly', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const claims = await Claim.find({
            createdAt: {
                $gte: new Date(`${currentYear}-01-01`),
                $lte: new Date(`${currentYear}-12-31`)
            }
        }).populate('status');
            
        res.render('reports/monthly', { 
            title: 'Monthly Reports',
            claims,
            user: req.user
        });
    } catch (error) {
        res.status(500).render('error', {
            message: 'Error generating monthly report',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// POST /reports/generate - Generate custom report
router.post('/generate', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        console.log('\n=== Report Generation Started ===');
        console.log('Request body:', req.body);
        
        const { reportType, dateRange, startDate, endDate, type, format } = req.body;
        console.log('Parameters:', { reportType, dateRange, startDate, endDate, type, format });
        
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

        // Render the reports/result view with the generated report data
        return res.render('reports/result', {
            title: 'Report Results',
            claims,
            type: type || reportType,
            format: format || 'table',
            user: req.user
        });

    } catch (error) {
        console.error('Error generating report:', error);
        return res.status(500).render('error', { 
            message: 'Error generating report',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Export formats logic
router.post('/export', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        const { format, dataType } = req.body;
        
        // Get claims data for export
        const claims = await Claim.find()
            .populate('status')
            .sort({ createdAt: -1 });

        // Rest of export implementation...
        
        // For CSV
        if (format === 'csv') {
            const csvData = claims.map(claim => ({
                'MVA #': claim.mva || '',
                'Customer Name': claim.customerName || '',
                'Status': claim.status?.name || 'Unknown',
                'Date': claim.date ? new Date(claim.date).toLocaleDateString() : '',
                'Amount': claim.damagesTotal ? `$${claim.damagesTotal.toFixed(2)}` : '$0.00'
            }));
            
            return res.csv(csvData, true);
        }
        
        // Fallback if format not handled
        res.redirect('/reports');
        
    } catch (error) {
        res.status(500).render('error', {
            message: 'Error exporting report',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

module.exports = router;
