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
    logRequest(req, 'Full export initiated');
    const exportId = crypto.randomUUID();
    const tempDirs = [];
    
    try {
        // Verify authentication and permissions
        if (!req.user.hasRole('admin')) {
            throw new Error('Unauthorized access to full export');
        }

        // Verify encryption key exists
        if (!process.env.EXPORT_ENCRYPTION_KEY) {
            logRequest(req, 'Export failed - No encryption key configured');
            return res.status(500).send('Export is not properly configured. Please contact your system administrator.');
        }

        // Add audit logging
        const auditLog = {
            user: req.user.email,
            action: 'full_export',
            timestamp: new Date(),
            ipAddress: req.ip
        };
        await AuditLog.create(auditLog);

        // Create a unique export ID
        const exportId = crypto.randomUUID();
        
        // Initialize progress in cache/database
        await Progress.create({
            id: exportId,
            type: 'export',
            status: 'started',
            total: 0,
            completed: 0
        });

        // Create temporary directory with tracking
        const tempDir = path.join(__dirname, '../temp', exportId);
        await fs.promises.mkdir(tempDir, { recursive: true });
        tempDirs.push(tempDir);

        // Initialize the archive with encryption
        const archive = archiver('zip', {
            zlib: { level: 9 },
            encrypt: true,
            password: process.env.EXPORT_ENCRYPTION_KEY
        });

        // Stream response
        res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="full_export.zip"',
            'Transfer-Encoding': 'chunked',
            'X-Export-Id': exportId
        });

        archive.pipe(res);

        // Stream-based export function
        const exportStream = async (Model, filename) => {
            const filePath = path.join(tempDir, filename);
            const writeStream = fs.createWriteStream(filePath);
            const total = await Model.countDocuments();
            let processed = 0;

            for await (const doc of Model.find().cursor()) {
                await new Promise((resolve, reject) => {
                    writeStream.write(
                        JSON.stringify(doc) + '\n',
                        error => error ? reject(error) : resolve()
                    );
                });
                processed++;
                await Progress.findByIdAndUpdate(exportId, {
                    total,
                    completed: processed
                });
            }

            await new Promise(resolve => writeStream.end(resolve));
            return filePath;
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

        // Export each collection
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
            const filePath = await exportStream(model, filename);
            const checksum = await calculateChecksum(filePath);
            
            archive.file(filePath, { name: filename });
            metadata.files.push({ 
                name: filename, 
                checksum,
                count: await model.countDocuments()
            });
        }

        // Handle uploaded files
        const uploadsDir = path.join(__dirname, '../uploads');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            metadata.files.push({
                name: 'uploads',
                fileCount: files.length
            });

            // Configure compression based on file types
            const compressibleTypes = ['.txt', '.json', '.xml'];
            const isCompressible = (filename) => 
                compressibleTypes.includes(path.extname(filename));

            for (const file of files) {
                const filePath = path.join(uploadsDir, file);
                const checksum = await calculateChecksum(filePath);
                
                archive.file(filePath, { 
                    name: `uploads/${file}`,
                    store: !isCompressible(file)
                });

                metadata.files.push({
                    name: `uploads/${file}`,
                    checksum,
                    size: fs.statSync(filePath).size
                });
            }
        }

        // Add metadata file last
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

        // Create audit log entry
        await AuditLog.create({
            user: req.user.email,
            action: 'full_export',
            timestamp: new Date(),
            ipAddress: req.ip,
            details: {
                exportId,
                fileCount: metadata.files.length
            }
        });

        // Finalize the archive
        await archive.finalize();

    } catch (error) {
        logRequest(req, 'Error during export', { 
            error: error.message,
            stack: error.stack
        });
        
        // Update progress status
        await Progress.findByIdAndUpdate(exportId, {
            status: 'failed',
            error: error.message
        }).catch(console.error);

        res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' 
                ? 'Error during export' 
                : error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        // Clean up all temporary directories
        for (const dir of tempDirs) {
            await fs.promises.rm(dir, { recursive: true, force: true })
                .catch(console.error);
        }
        
        // Update progress status if not already failed
        const progress = await Progress.findById(exportId);
        if (progress && progress.status !== 'failed') {
            await Progress.findByIdAndUpdate(exportId, {
                status: 'completed'
            }).catch(console.error);
        }
    }
});

module.exports = router; // Export the router
