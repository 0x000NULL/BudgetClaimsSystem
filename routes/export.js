/**
 * @fileoverview This module defines the export routes for the Budget Claims System.
 * It handles the creation of a full export of users, claims, and uploaded files into a zip archive.
 * Sensitive fields in the request body are filtered out before logging.
 * 
 * @module routes/export
 */

const express = require('express'); // Import Express to create a router
const fs = require('fs'); // Import the file system module to interact with the file system
const path = require('path'); // Import the path module to work with file and directory paths
const archiver = require('archiver'); // Import Archiver to create zip archives
const User = require('../models/User'); // Import the User model to interact with the users collection in MongoDB
const Claim = require('../models/Claim'); // Import the Claim model to interact with the claims collection in MongoDB
const pinoLogger = require('../logger'); // Import Pino logger
const AuditLog = require('../models/AuditLog'); // Import the AuditLog model to interact with the audit logs collection in MongoDB
const crypto = require('crypto'); // Import crypto module for generating UUIDs
const Progress = require('../models/Progress'); // Import the Progress model to interact with the progress collection in MongoDB
const Settings = require('../models/Settings'); // Add missing model imports
const EmailTemplate = require('../models/EmailTemplate'); // Add missing model imports
const Status = require('../models/Status'); // Add missing model imports
const Location = require('../models/Location'); // Add missing model imports

const router = express.Router(); // Create a new router

// Define sensitive fields that should not be logged
const sensitiveFields = ['password', 'token', 'ssn'];

/**
 * Filters out sensitive fields from the provided data object.
 * 
 * @param {Object} data - The data object to filter.
 * @returns {Object} The filtered data object with sensitive fields masked.
 */
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

/**
 * Logs the request details along with user and session information.
 * 
 * @param {Object} req - The Express request object.
 * @param {string} message - The log message.
 * @param {Object} [extra={}] - Additional information to log.
 */
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

// Add this near the top of your file
const ensureTempDir = async () => {
    const tempDir = path.join(__dirname, '../temp');
    try {
        await fs.promises.mkdir(tempDir, { recursive: true });
    } catch (error) {
        console.error('Error creating temp directory:', error);
        throw error;
    }
};

/**
 * Route to handle full export of users, claims, and uploaded files.
 * Creates a zip archive containing the data and sends it as a download.
 * 
 * @name GET /full
 * @function
 * @memberof module:routes/export
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
router.get('/full', async (req, res) => {
    await ensureTempDir();
    console.log('Current user:', {
        id: req.user?._id,
        email: req.user?.email,
        role: req.user?.role,
        roles: req.user?.roles
    });
    
    logRequest(req, 'Full export initiated');
    const exportId = crypto.randomUUID();
    const tempDirs = [];
    let responseStarted = false;
    
    // Set up error handler for the response
    res.on('error', (error) => {
        console.error('Response stream error:', error);
        cleanup();
    });

    // Set up error handler for the request
    req.on('error', (error) => {
        console.error('Request stream error:', error);
        cleanup();
    });

    // Handle client disconnect
    req.on('close', () => {
        if (!res.writableEnded) {
            console.log('Client disconnected before download completed');
            cleanup();
        }
    });

    // Cleanup function
    const cleanup = async () => {
        try {
            for (const dir of tempDirs) {
                await fs.promises.rm(dir, { recursive: true, force: true });
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    };
    
    try {
        // Verify authentication and permissions
        if (!req.user || 
            (!req.user.role === 'admin' && 
             (!req.user.roles || !req.user.roles.includes('admin')))) {
            logRequest(req, 'Unauthorized access attempt to full export');
            return res.status(403).json({
                success: false,
                message: 'Unauthorized. Admin access required.'
            });
        }

        // Add audit logging with stringified details
        const auditLog = {
            user: req.user._id.toString(),
            action: 'full_export',
            timestamp: new Date(),
            ipAddress: req.ip,
            details: JSON.stringify({ userEmail: req.user.email })
        };
        await AuditLog.create(auditLog);

        // Initialize progress in cache/database with correct field name
        await Progress.create({
            exportId: exportId,
            type: 'export',
            status: 'started',
            total: 0,
            completed: 0
        });

        // Create temporary directory with tracking
        const tempDir = path.join(__dirname, '../temp', exportId);
        await fs.promises.mkdir(tempDir, { recursive: true });
        tempDirs.push(tempDir);

        // Initialize the archive
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        // Listen for archive warnings
        archive.on('warning', (err) => {
            console.warn('Archive warning:', err);
        });

        // Listen for archive errors
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!responseStarted) {
                res.status(500).json({
                    success: false,
                    message: 'Archive creation failed'
                });
            }
            cleanup();
        });

        // Set response headers
        res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="export-${exportId}.zip"`,
            'Transfer-Encoding': 'chunked'
        });
        responseStarted = true;

        // Pipe archive data to response
        archive.pipe(res);

        // Stream-based export function with error handling
        const exportStream = async (Model, filename) => {
            const filePath = path.join(tempDir, filename);
            const writeStream = fs.createWriteStream(filePath);
            const total = await Model.countDocuments();
            let processed = 0;

            try {
                console.log(`Exporting ${filename} - Found ${total} documents`);
                
                for await (const doc of Model.find().cursor()) {
                    await new Promise((resolve, reject) => {
                        writeStream.write(
                            JSON.stringify(doc.toJSON()) + '\n',
                            error => error ? reject(error) : resolve()
                        );
                    });
                    processed++;
                    await Progress.findOneAndUpdate(
                        { exportId: exportId },
                        {
                            total,
                            completed: processed
                        }
                    );
                }

                await new Promise(resolve => writeStream.end(resolve));
                console.log(`Completed exporting ${filename}`);
                return filePath;
            } catch (error) {
                console.error(`Error exporting ${filename}:`, error);
                throw error;
            }
        };

        // Calculate checksum for a file
        const calculateChecksum = async (filePath) => {
            return new Promise((resolve, reject) => {
                const hash = crypto.createHash('sha256');
                fs.createReadStream(filePath)
                    .on('data', data => hash.update(data))
                    .on('end', () => resolve(hash.digest('hex')))
                    .on('error', reject);
            });
        };

        // Initialize metadata
        const metadata = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            files: [],
            exportedBy: req.user.email,
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                appVersion: process.env.APP_VERSION
            },
            contents: {
                users: await User.countDocuments(),
                claims: await Claim.countDocuments(),
                auditLogs: await AuditLog.countDocuments(),
                settings: await Settings.countDocuments(),
                emailTemplates: await EmailTemplate.countDocuments(),
                statuses: await Status.countDocuments(),
                locations: await Location.countDocuments()
            }
        };

        // Export each collection with validation
        const collections = [
            { model: User, filename: 'users.json' },
            { model: Claim, filename: 'claims.json' },
            { model: AuditLog, filename: 'audit_logs.json' },
            { model: Settings, filename: 'settings.json' },
            { model: EmailTemplate, filename: 'email_templates.json' },
            { model: Status, filename: 'statuses.json' },
            { model: Location, filename: 'locations.json' }
        ];

        for (const { model, filename } of collections) {
            try {
                console.log(`Starting export of ${filename}`);
                const filePath = await exportStream(model, filename);
                const checksum = await calculateChecksum(filePath);
                
                // Verify file exists and has content
                if (!fs.existsSync(filePath)) {
                    throw new Error(`Export file ${filename} was not created`);
                }
                
                const stats = fs.statSync(filePath);
                if (stats.size === 0) {
                    console.warn(`Warning: ${filename} is empty`);
                }

                archive.file(filePath, { name: filename });
                metadata.files.push({ 
                    name: filename, 
                    checksum,
                    count: await model.countDocuments(),
                    size: stats.size
                });
                console.log(`Successfully added ${filename} to archive`);
            } catch (error) {
                console.error(`Error processing ${filename}:`, error);
                throw error;
            }
        }

        // Handle uploaded files with better error handling
        const uploadsDir = path.join(__dirname, '../uploads');
        if (fs.existsSync(uploadsDir)) {
            try {
                const files = fs.readdirSync(uploadsDir);
                console.log(`Found ${files.length} files in uploads directory`);
                
                metadata.files.push({
                    name: 'uploads',
                    fileCount: files.length
                });

                for (const file of files) {
                    const filePath = path.join(uploadsDir, file);
                    if (fs.existsSync(filePath)) {
                        const checksum = await calculateChecksum(filePath);
                        const stats = fs.statSync(filePath);
                        
                        archive.file(filePath, { 
                            name: `uploads/${file}`
                        });

                        metadata.files.push({
                            name: `uploads/${file}`,
                            checksum,
                            size: stats.size
                        });
                        console.log(`Added ${file} to archive`);
                    }
                }
            } catch (error) {
                console.error('Error processing uploads:', error);
                throw error;
            }
        } else {
            console.log('Uploads directory does not exist');
        }

        // Add metadata and finalize
        console.log('Adding metadata to archive');
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

        // Create audit log entry with stringified details
        await AuditLog.create({
            user: req.user._id.toString(),
            action: 'full_export',
            timestamp: new Date(),
            ipAddress: req.ip,
            details: JSON.stringify({
                exportId,
                fileCount: metadata.files.length,
                userEmail: req.user.email
            })
        });

        // Finalize the archive
        console.log('Finalizing archive');
        await archive.finalize();
        console.log('Archive finalized successfully');

    } catch (error) {
        console.error('Export error:', error);
        
        if (!responseStarted) {
            res.status(500).json({
                success: false,
                message: 'Export failed',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        } else {
            // If we've started streaming, try to end the response gracefully
            try {
                res.end();
            } catch (endError) {
                console.error('Error ending response:', endError);
            }
        }
        
        await cleanup();
    }
});

module.exports = router; // Export the router
