/**
 * @fileoverview This module defines the routes for handling data import in the Budget Claims System.
 * It uses Express for routing, Multer for file uploads, and various Node.js modules for file operations.
 * The main functionality includes uploading a zip file, extracting its contents, and importing users and claims data into MongoDB.
 * Sensitive fields in the request body are filtered out before logging.
 * 
 * @module routes/import
 */

 /**
 * Filters out sensitive fields from the provided data object.
 * 
 * @function filterSensitiveData
 * @param {Object} data - The data object to be filtered.
 * @returns {Object} - The filtered data object with sensitive fields masked.
 */

 /**
 * Logs the request details along with user and session information.
 * 
 * @function logRequest
 * @param {Object} req - The Express request object.
 * @param {string} message - The log message.
 * @param {Object} [extra={}] - Additional information to log.
 */

 /**
 * Route to handle full data import.
 * 
 * @name POST /full
 * @function
 * @memberof module:routes/import
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @returns {void}
 * @throws Will throw an error if the import process fails.
 */
const express = require('express'); // Import Express to create a router
const fs = require('fs'); // Import Node.js file system module to handle file operations
const path = require('path'); // Import Node.js path module to handle and transform file paths
const multer = require('multer'); // Import multer for handling file uploads
const User = require('../models/User'); // Import the User model to interact with the users collection in MongoDB
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const archiver = require('archiver'); // Import archiver for creating zip files (not used in this code snippet)
const extract = require('extract-zip'); // Import extract-zip for extracting zip files
const pinoLogger = require('../logger'); // Import Pino logger
const AuditLog = require('../models/AuditLog'); // Import the AuditLog model to interact with the audit_logs collection in MongoDB
const Settings = require('../models/Settings'); // Import the Settings model to interact with the settings collection in MongoDB
const EmailTemplate = require('../models/EmailTemplate'); // Import the EmailTemplate model to interact with the email_templates collection in MongoDB
const Status = require('../models/Status'); // Import the Status model to interact with the statuses collection in MongoDB
const Location = require('../models/Location'); // Import the Location model to interact with the locations collection in MongoDB
const crypto = require('crypto');
const { parse } = require('csv-parse');
const xlsx = require('xlsx');
const os = require('os');
const debug = require('debug')('app:import');
const mongoose = require('mongoose');

const router = express.Router(); // Create a new router

// Define sensitive fields that should not be logged
const sensitiveFields = ['password', 'token', 'ssn'];

const filterSensitiveData = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }
    
    return Object.keys(data).reduce((filteredData, key) => {
        if (sensitiveFields.includes(key)) {
            filteredData[key] = '***REDACTED***';
        } else if (typeof data[key] === 'object') {
            filteredData[key] = filterSensitiveData(data[key]);
        } else {
            filteredData[key] = data[key];
        }
        return filteredData;
    }, {});
};

const logRequest = (req, message, extra = {}) => {
    const { method, originalUrl, headers, body } = req;
    const filteredBody = filterSensitiveData(body);

    pinoLogger.info({
        message,
        user: req.user ? req.user.email : 'Unauthenticated',
        ip: req.ip,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString(),
        method,
        url: originalUrl,
        requestBody: filteredBody,
        headers,
        ...extra
    });
};

// Helper function to handle file upload
const handleFileUpload = async (file, allowedExtensions) => {
    if (!file) {
        throw new Error('No file uploaded');
    }

    const fileExt = path.extname(file.name).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
        throw new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
    }

    // Ensure uploads directory exists
    const uploadDir = path.join(__dirname, '../uploads');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const fileName = `import-${uniqueSuffix}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);

    try {
        await file.mv(filePath);
        debug('File moved successfully to:', filePath);
        return filePath;
    } catch (error) {
        debug('Error moving file:', error);
        throw new Error(`Failed to save uploaded file: ${error.message}`);
    }
};

// Add this after the other helper functions and before the routes

/**
 * Converts an Excel file to CSV format
 * 
 * @function convertExcelToCsv
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<string>} Path to the converted CSV file
 */
const convertExcelToCsv = async (filePath) => {
    try {
        // Read the Excel file
        const workbook = xlsx.readFile(filePath);
        
        // Get the first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert to array of arrays first
        const data = xlsx.utils.sheet_to_json(firstSheet, { 
            header: 1,
            raw: false,
            dateNF: 'MM/DD/YY',
            defval: '' // Default empty cells to empty string
        });

        // Find and clean the header row
        const headerRowIndex = data.findIndex(row => 
            row.some(cell => cell && cell.toString().trim() === 'Claim #')
        );

        if (headerRowIndex === -1) {
            throw new Error('Could not find header row in Excel file');
        }

        // Get headers and clean them
        const headers = data[headerRowIndex].map(header => 
            header ? header.toString().trim().replace(/\s+/g, ' ') : ''
        );

        // Convert remaining rows to objects
        const records = data.slice(headerRowIndex + 1)
            .filter(row => row.some(cell => cell)) // Remove empty rows
            .map(row => {
                const record = {};
                headers.forEach((header, index) => {
                    if (header && row[index]) {
                        let value = row[index].toString().trim();
                        // Handle special case for numeric values that might be "0.00"
                        if (value === '0.00') value = '0';
                        record[header] = value;
                    }
                });
                return record;
            });

        debugData('Headers found:', headers);
        debugData('First record:', records[0]);

        // Convert back to CSV
        const csvRows = [
            headers.join(','),
            ...records.map(record => 
                headers.map(header => record[header] || '').join(',')
            )
        ];

        const csvString = csvRows.join('\n');

        // Create temporary file path
        const tempDir = path.join(__dirname, '../uploads');
        const tempFile = path.join(tempDir, `${path.basename(filePath, path.extname(filePath))}.csv`);
        
        // Write CSV content to file
        await fs.promises.writeFile(tempFile, csvString, 'utf-8');
        
        debug('Excel file converted to CSV:', tempFile);
        return tempFile;

    } catch (error) {
        debug('Error converting Excel to CSV:', error);
        throw new Error(`Failed to convert Excel file: ${error.message}`);
    }
};

// Add this helper function to parse CSV content
const parseCSV = (content) => {
    return new Promise((resolve, reject) => {
        parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relaxColumnCount: true
        }, (err, records) => {
            if (err) reject(err);
            else resolve(records);
        });
    });
};

// Add these helper functions for Rentworks data processing
const parseRentworksDate = (dateStr) => {
    if (!dateStr || dateStr === '?' || dateStr === '') return null;
    
    // Handle different date formats
    const formats = [
        'MM/DD/YY',
        'MM/DD/YYYY',
        'M/D/YY',
        'M/D/YYYY'
    ];

    for (const format of formats) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    return null;
};

const mapRentworksStatus = (status) => {
    if (!status) return 'Pending';
    
    // Map common Rentworks statuses to our system's statuses
    const statusMap = {
        'Pending': 'Pending',
        'Closed': 'Closed',
        'Open': 'Open',
        'LDW Discharge': 'Closed',
        'Litigation': 'Open',
        'Renter Resp': 'Open',
        '': 'Pending'
        // Add more mappings as needed
    };
    
    return statusMap[status] || status; // Use original status if no mapping exists
};

// Add this debug helper at the top with other helpers
const debugData = (label, data) => {
    debug(`${label}:`, JSON.stringify(data, null, 2));
};

// Add this helper function to handle status creation/lookup
const getOrCreateStatus = async (statusName) => {
    try {
        // Try to find existing status (case-insensitive)
        let status = await Status.findOne({ 
            name: { 
                $regex: new RegExp(`^${statusName}$`, 'i') 
            }
        });

        // If status doesn't exist, create it
        if (!status) {
            debug('Creating new status:', statusName);
            
            // Try to create the status, handle potential race condition
            try {
                status = await Status.create({
                    name: statusName,
                    description: `Status created from Rentworks import: ${statusName}`,
                    active: true
                });
                debug('Created new status:', status);
            } catch (createError) {
                // If creation failed due to duplicate key, try to find it again
                if (createError.code === 11000) {
                    debug('Status was created by another process, retrieving existing status');
                    status = await Status.findOne({ 
                        name: { 
                            $regex: new RegExp(`^${statusName}$`, 'i') 
                        }
                    });
                    
                    if (!status) {
                        throw new Error('Failed to find status after duplicate key error');
                    }
                } else {
                    throw createError;
                }
            }
        } else {
            debug('Found existing status:', status.name);
        }

        return status._id;
    } catch (error) {
        debug('Error handling status:', error);
        throw new Error(`Failed to process status "${statusName}": ${error.message}`);
    }
};

// Add this helper function at the top with other helpers
const createImportUser = async (rentworksId) => {
    try {
        // Try to find existing import user
        let user = await User.findOne({ 
            rentworksId: rentworksId 
        });

        // If user doesn't exist, create it
        if (!user) {
            user = await User.create({
                email: `rentworks.${rentworksId}@import.system`,
                name: `Rentworks User ${rentworksId}`,
                rentworksId: rentworksId,
                role: 'system',
                password: crypto.randomBytes(16).toString('hex') // Random password
            });
        }

        return user._id;
    } catch (error) {
        debug('Error creating import user:', error);
        return null;
    }
};

// Then modify the mapRentworksRecord function
const mapRentworksRecord = async (record) => {
    debugData('Mapping Rentworks record', record);
    
    // Clean and prepare the record data
    const cleanRecord = Object.entries(record).reduce((acc, [key, value]) => {
        const cleanKey = key.trim().replace(/\s+/g, ' ');
        acc[cleanKey] = value ? value.toString().trim() : '';
        return acc;
    }, {});

    debugData('Cleaned record', cleanRecord);
    
    // Get or create status
    const statusName = mapRentworksStatus(cleanRecord['Status']);
    const statusId = await getOrCreateStatus(statusName);
    
    const claimData = {
        claimNumber: cleanRecord['Claim #'],
        customerName: cleanRecord['Renter'],
        status: statusId,
        lossDamageWaiver: cleanRecord['LDW']?.toLowerCase() === 'yes' ? 'Yes' : 'No',
        mva: cleanRecord['Unit #'],
        raNumber: cleanRecord['RA Number'],
        date: parseRentworksDate(cleanRecord['Claim Date'])
    };

    // Add summary as a note if it exists
    if (cleanRecord['Summary']) {
        const userId = cleanRecord['Entered By'] ? 
            await createImportUser(cleanRecord['Entered By']) : 
            null;

        claimData.notes = [{
            content: cleanRecord['Summary'],
            type: 'import',
            source: 'Rentworks',
            createdAt: new Date(),
            createdBy: userId
        }];
    }
    
    // Remove empty/null/undefined values
    Object.keys(claimData).forEach(key => {
        if (claimData[key] === undefined || claimData[key] === null || claimData[key] === '') {
            delete claimData[key];
        }
    });
    
    debugData('Mapped to claim data', claimData);
    return claimData;
};

// Modify the external route handler's processing section
router.post('/external', async (req, res) => {
    let uploadedFile = null;
    let convertedFile = null;

    try {
        if (!req.files || !req.files.importFile) {
            throw new Error('No file uploaded');
        }

        const allowedExtensions = ['.csv', '.xls', '.xlsx'];
        uploadedFile = await handleFileUpload(req.files.importFile, allowedExtensions);
        
        debug('File uploaded successfully:', uploadedFile);
        debug('Form data:', req.body);

        // Process the file based on its type
        const fileExt = path.extname(uploadedFile).toLowerCase();
        let csvFilePath = uploadedFile;

        if (['.xlsx', '.xls'].includes(fileExt)) {
            csvFilePath = await convertExcelToCsv(uploadedFile);
            convertedFile = csvFilePath;
        }

        // Process based on selected system
        if (req.body.system === 'rentworks-csv') {
            const fileContent = await fs.promises.readFile(csvFilePath, 'utf-8');
            debugData('Raw file content', fileContent.substring(0, 500));

            const records = await parseCSV(fileContent);
            debugData('Raw parsed records', records.slice(0, 2));

            debug('Total parsed records:', records.length);

            // Use Promise.all since mapRentworksRecord is now async
            const claimRecords = await Promise.all(
                records.map(record => mapRentworksRecord(record))
            );

            const filteredClaimRecords = claimRecords.filter(data => {
                const hasRequiredFields = data.claimNumber; // Must have at least a claim number
                if (!hasRequiredFields) {
                    debug('Filtered out record without required fields');
                }
                return hasRequiredFields;
            });

            debug('Filtered claim records count:', filteredClaimRecords.length);
            debugData('First claim record', filteredClaimRecords[0]);

            if (filteredClaimRecords.length === 0) {
                throw new Error('No valid claims found in the imported file');
            }

            // Create/update claims in database
            const results = await Promise.allSettled(
                filteredClaimRecords.map(async record => {
                    try {
                        if (!record.claimNumber) {
                            debug('Skipping record without claim number');
                            debugData('Skipped record', record);
                            return null;
                        }

                        const existingClaim = await Claim.findOne({ 
                            claimNumber: record.claimNumber 
                        });

                        if (existingClaim) {
                            debug('Found existing claim:', record.claimNumber);
                            const updated = await Claim.findOneAndUpdate(
                                { claimNumber: record.claimNumber },
                                record,
                                { new: true }
                            );
                            debugData('Updated claim', updated);
                            return updated;
                        } else {
                            debug('Creating new claim:', record.claimNumber);
                            const created = await Claim.create(record);
                            debugData('Created claim', created);
                            return created;
                        }
                    } catch (error) {
                        debug('Error processing claim:', error);
                        debugData('Problem record', record);
                        throw new Error(`Error processing claim ${record.claimNumber}: ${error.message}`);
                    }
                })
            );

            const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value);
            const failedResults = results.filter(r => r.status === 'rejected' || !r.value);

            debugData('Import results', {
                successful: {
                    count: successfulResults.length,
                    claims: successfulResults.map(r => r.value?.claimNumber)
                },
                failed: {
                    count: failedResults.length,
                    errors: failedResults.map(r => ({
                        error: r.reason?.message || 'Unknown error',
                        claim: r.reason?.claimNumber
                    }))
                }
            });

            // Also check Mongoose connection
            debug('Mongoose connection state:', mongoose.connection.readyState);
            // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting

            res.json({
                success: true,
                message: 'Import completed successfully',
                details: {
                    recordsProcessed: filteredClaimRecords.length,
                    successCount: successfulResults.length,
                    failureCount: failedResults.length,
                    errors: failedResults.map(r => r.reason?.message || 'Unknown error')
                }
            });
        } else {
            throw new Error('Unsupported import system');
        }

    } catch (error) {
        debug('Error in upload handler:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Upload failed'
        });
    } finally {
        // Cleanup files
        try {
            if (uploadedFile && fs.existsSync(uploadedFile)) {
                await fs.promises.unlink(uploadedFile);
                debug('Cleaned up uploaded file:', uploadedFile);
            }
            if (convertedFile && fs.existsSync(convertedFile)) {
                await fs.promises.unlink(convertedFile);
                debug('Cleaned up converted file:', convertedFile);
            }
        } catch (cleanupError) {
            debug('Error during file cleanup:', cleanupError);
        }
    }
});

module.exports = router; // Export the router
