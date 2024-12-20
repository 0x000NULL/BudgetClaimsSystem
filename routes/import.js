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

// Configure multer for file upload
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/zip') {
            cb(new Error('Only ZIP files are allowed'), false);
        }
        cb(null, true);
    }
});

// Helper function to extract an encrypted archive
async function extractArchive(archivePath, extractPath, password) {
    return new Promise((resolve, reject) => {
        const unzipper = require('unzipper');
        fs.createReadStream(archivePath)
            .pipe(unzipper.Extract({ 
                path: extractPath,
                password: password 
            }))
            .on('close', resolve)
            .on('error', reject);
    });
}

// Helper function to backup a collection
async function backupCollection(Model, backupPath) {
    const filename = `${Model.modelName.toLowerCase()}_backup.json`;
    const filePath = path.join(backupPath, filename);
    const data = await Model.find({}).lean();
    await fs.promises.writeFile(filePath, JSON.stringify(data));
    return filePath;
}

// Helper function to restore from backup
async function restoreFromBackup(Model, backupPath) {
    const filename = `${Model.modelName.toLowerCase()}_backup.json`;
    const filePath = path.join(backupPath, filename);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
        await Model.deleteMany({});
        await Model.insertMany(data);
    }
}

// Add stream processing helper
const streamProcess = async (readStream, onChunk) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readStream
            .on('data', chunk => {
                chunks.push(chunk);
                onChunk && onChunk(chunk);
            })
            .on('end', () => resolve(Buffer.concat(chunks)))
            .on('error', reject);
    });
};

router.post('/full', upload.single('file'), async (req, res) => {
    const importId = crypto.randomUUID();
    const tempDirs = [];
    let collections = null;
    
    try {
        // Verify authentication and permissions
        if (!req.user.hasRole('admin')) {
            throw new Error('Unauthorized access to full import');
        }

        // Verify file exists and has correct extension
        if (!req.file || !req.file.path.endsWith('.zip')) {
            throw new Error('Invalid file format. Please upload a zip file.');
        }

        // Verify encryption key exists
        if (!process.env.EXPORT_ENCRYPTION_KEY) {
            logRequest(req, 'Import failed - No encryption key configured');
            return res.status(500).send('Import is not properly configured. Please contact your system administrator.');
        }

        // Initialize progress tracking with total file size
        const totalSize = fs.statSync(req.file.path).size;
        await Progress.create({
            id: importId,
            type: 'import',
            status: 'started',
            total: totalSize,
            completed: 0,
            startTime: new Date()
        });

        // Create temporary directories with error handling
        const createTempDir = async (name) => {
            const dir = path.join(__dirname, '../temp', `${importId}-${name}`);
            await fs.promises.mkdir(dir, { recursive: true });
            tempDirs.push(dir);
            return dir;
        };

        const extractPath = await createTempDir('extract');
        const backupPath = await createTempDir('backup');

        // Extract with progress tracking
        await new Promise((resolve, reject) => {
            const unzipper = require('unzipper');
            let bytesProcessed = 0;

            fs.createReadStream(req.file.path)
                .on('data', chunk => {
                    bytesProcessed += chunk.length;
                    Progress.findByIdAndUpdate(importId, {
                        completed: bytesProcessed
                    }).catch(console.error);
                })
                .pipe(unzipper.Extract({ 
                    path: extractPath,
                    password: process.env.EXPORT_ENCRYPTION_KEY 
                }))
                .on('close', resolve)
                .on('error', reject);
        });

        // Verify metadata and version compatibility
        const metadata = JSON.parse(await fs.promises.readFile(path.join(extractPath, 'metadata.json'), 'utf8'));
        if (!metadata.version || !metadata.version.startsWith('1.')) {
            throw new Error(`Incompatible import file version: ${metadata.version}`);
        }

        // Define collections with validation rules
        collections = [
            { 
                model: User, 
                requiredFields: ['email', 'role'],
                validate: data => {
                    if (!data.email || !data.email.includes('@')) {
                        throw new Error('Invalid email format');
                    }
                }
            },
            { 
                model: Claim, 
                requiredFields: ['claimId', 'status'],
                validate: data => {
                    if (!data.claimId || typeof data.claimId !== 'string') {
                        throw new Error('Invalid claimId format');
                    }
                }
            },
            // ... other collections with their validation rules ...
        ];

        // Backup existing data with progress tracking
        await Progress.findByIdAndUpdate(importId, { status: 'backing_up' });
        for (const { model } of collections) {
            await backupCollection(model, backupPath);
        }

        // Verify file integrity with progress updates
        await Progress.findByIdAndUpdate(importId, { status: 'verifying' });
        for (const file of metadata.files) {
            if (file.checksum) {
                const filePath = path.join(extractPath, file.name);
                const hash = crypto.createHash('sha256');
                await streamProcess(
                    fs.createReadStream(filePath),
                    chunk => hash.update(chunk)
                );
                const calculatedHash = hash.digest('hex');
                
                if (calculatedHash !== file.checksum) {
                    throw new Error(`File integrity check failed for ${file.name}`);
                }
            }
        }

        // Import collections with transaction-like behavior
        await Progress.findByIdAndUpdate(importId, { status: 'importing' });
        for (const { model, requiredFields, validate } of collections) {
            const filename = `${model.modelName.toLowerCase()}.json`;
            const filePath = path.join(extractPath, filename);
            
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));

                // Validate data structure and required fields
                if (!Array.isArray(data)) {
                    throw new Error(`Invalid data format for ${model.modelName}`);
                }

                // Validate each record
                data.forEach((item, index) => {
                    requiredFields.forEach(field => {
                        if (!item[field]) {
                            throw new Error(`Missing required field '${field}' in ${model.modelName} at index ${index}`);
                        }
                    });
                    validate && validate(item);
                });

                // Use transactions if available
                const session = await model.startSession();
                try {
                    await session.withTransaction(async () => {
                        await model.deleteMany({}, { session });
                        await model.insertMany(data, { session });
                    });
                } finally {
                    await session.endSession();
                }
            }
        }

        // Import uploaded files with type and size validation
        const uploadsDir = path.join(__dirname, '../uploads');
        const importedUploadsDir = path.join(extractPath, 'uploads');
        if (fs.existsSync(importedUploadsDir)) {
            const allowedExtensions = ['.pdf', '.jpg', '.png', '.doc', '.docx'];
            const maxFileSize = 10 * 1024 * 1024; // 10MB
            const files = await fs.promises.readdir(importedUploadsDir);
            
            for (const file of files) {
                const ext = path.extname(file).toLowerCase();
                if (!allowedExtensions.includes(ext)) {
                    throw new Error(`Invalid file type for ${file}`);
                }
                
                const sourcePath = path.join(importedUploadsDir, file);
                const stats = await fs.promises.stat(sourcePath);
                if (stats.size > maxFileSize) {
                    throw new Error(`File ${file} exceeds maximum size limit`);
                }
                
                const targetPath = path.join(uploadsDir, file);
                await fs.promises.copyFile(sourcePath, targetPath);
            }
        }

        // Create detailed audit log entry
        const collectionStats = await Promise.all(
            collections.map(async ({ model }) => ({
                name: model.modelName,
                count: await model.countDocuments()
            }))
        );

        await AuditLog.create({
            user: req.user.email,
            action: 'full_import',
            timestamp: new Date(),
            ipAddress: req.ip,
            details: {
                importId,
                metadata,
                duration: Date.now() - progress.startTime,
                collections: collectionStats
            }
        });

        res.json({
            success: true,
            message: 'Import completed successfully',
            importId,
            details: {
                duration: Date.now() - progress.startTime,
                collectionsImported: collections.length
            }
        });

    } catch (error) {
        logRequest(req, 'Error during import', { 
            error: error.message,
            stack: error.stack
        });

        // Attempt to restore from backup
        if (collections) {
            try {
                for (const { model } of collections) {
                    await restoreFromBackup(model, backupPath);
                }
            } catch (restoreError) {
                logRequest(req, 'Error during backup restoration', {
                    error: restoreError.message
                });
            }
        }

        await Progress.findByIdAndUpdate(importId, {
            status: 'failed',
            error: error.message,
            endTime: new Date()
        });

        res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' 
                ? 'Error during import' 
                : error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });

    } finally {
        // Ensure cleanup of temporary files
        for (const dir of tempDirs) {
            await fs.promises.rm(dir, { recursive: true, force: true })
                .catch(console.error);
        }
        if (req.file?.path) {
            await fs.promises.unlink(req.file.path).catch(console.error);
        }

        // Update final progress status
        const progress = await Progress.findById(importId);
        if (progress?.status !== 'failed') {
            await Progress.findByIdAndUpdate(importId, {
                status: 'completed',
                endTime: new Date()
            }).catch(console.error);
        }
    }
});

module.exports = router; // Export the router
