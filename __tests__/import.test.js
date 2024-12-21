const request = require('supertest');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const extract = require('extract-zip');
const User = require('../models/User');
const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const Settings = require('../models/Settings');
const Progress = require('../models/Progress');
const pinoLogger = require('../logger');
const importRoutes = require('../routes/import');

// Create Express app for testing
const app = express();

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('extract-zip');
jest.mock('../models/User');
jest.mock('../models/Claim');
jest.mock('../models/AuditLog');
jest.mock('../models/Settings');
jest.mock('../models/Progress');
jest.mock('../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

// Setup Express middleware and routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/import', importRoutes);

describe('Import Routes', () => {
    let mockUser;
    let mockFile;
    let mockMetadata;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock user
        mockUser = {
            id: 'testUserId',
            email: 'test@example.com',
            role: 'admin',
            hasRole: jest.fn().mockReturnValue(true)
        };

        // Setup mock file
        mockFile = {
            fieldname: 'file',
            originalname: 'test.zip',
            encoding: '7bit',
            mimetype: 'application/zip',
            destination: 'uploads/',
            filename: 'test-123.zip',
            path: 'uploads/test-123.zip',
            size: 12345
        };

        // Setup mock metadata
        mockMetadata = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            files: [
                { name: 'users.json', checksum: 'abc123' },
                { name: 'claims.json', checksum: 'def456' }
            ]
        };

        // Mock file system operations
        fs.promises = {
            mkdir: jest.fn().mockResolvedValue(undefined),
            readFile: jest.fn().mockImplementation((path) => {
                if (path.includes('metadata.json')) {
                    return Promise.resolve(JSON.stringify(mockMetadata));
                }
                if (path.includes('users.json')) {
                    return Promise.resolve(JSON.stringify([{ email: 'user@test.com' }]));
                }
                if (path.includes('claims.json')) {
                    return Promise.resolve(JSON.stringify([{ claimId: 'CLAIM-001' }]));
                }
                return Promise.resolve('');
            }),
            writeFile: jest.fn().mockResolvedValue(undefined),
            unlink: jest.fn().mockResolvedValue(undefined),
            rm: jest.fn().mockResolvedValue(undefined),
            stat: jest.fn().mockResolvedValue({ size: 1000 })
        };

        // Mock crypto for file verification
        global.crypto = {
            createHash: jest.fn().mockReturnValue({
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('abc123')
            })
        };

        // Mock Progress model
        Progress.create.mockResolvedValue({ id: 'progress-123' });
        Progress.findById.mockResolvedValue({
            id: 'progress-123',
            status: 'in_progress'
        });
        Progress.findByIdAndUpdate.mockResolvedValue({});

        // Setup mock database operations
        User.startSession.mockResolvedValue({
            withTransaction: jest.fn(cb => cb()),
            endSession: jest.fn()
        });
        Claim.startSession.mockResolvedValue({
            withTransaction: jest.fn(cb => cb()),
            endSession: jest.fn()
        });
    });

    describe('POST /import/full', () => {
        it('should handle successful data import', async () => {
            const res = await request(app)
                .post('/import/full')
                .attach('file', Buffer.from('mock zip content'), mockFile.originalname)
                .expect(200);

            expect(res.body).toEqual({
                success: true,
                message: 'Import completed successfully',
                importId: expect.any(String),
                details: expect.objectContaining({
                    duration: expect.any(Number),
                    collectionsImported: expect.any(Number)
                })
            });

            expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                action: 'full_import',
                user: mockUser.email
            }));
        });

        it('should validate file type', async () => {
            const res = await request(app)
                .post('/import/full')
                .attach('file', Buffer.from('invalid content'), 'test.txt')
                .expect(400);

            expect(res.body.message).toBe('Invalid file format. Please upload a zip file.');
        });

        it('should handle missing encryption key', async () => {
            process.env.EXPORT_ENCRYPTION_KEY = '';

            const res = await request(app)
                .post('/import/full')
                .attach('file', Buffer.from('mock zip content'), mockFile.originalname)
                .expect(500);

            expect(res.body.message).toBe('Import is not properly configured. Please contact your system administrator.');
        });

        it('should handle invalid metadata version', async () => {
            mockMetadata.version = '2.0';
            fs.promises.readFile.mockImplementation((path) => {
                if (path.includes('metadata.json')) {
                    return Promise.resolve(JSON.stringify(mockMetadata));
                }
                return Promise.resolve('');
            });

            const res = await request(app)
                .post('/import/full')
                .attach('file', Buffer.from('mock zip content'), mockFile.originalname)
                .expect(400);

            expect(res.body.message).toContain('Incompatible import file version');
        });

        it('should handle file integrity check failure', async () => {
            global.crypto.createHash.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('wrong-hash')
            });

            const res = await request(app)
                .post('/import/full')
                .attach('file', Buffer.from('mock zip content'), mockFile.originalname)
                .expect(500);

            expect(res.body.message).toContain('File integrity check failed');
        });

        it('should handle database transaction failures', async () => {
            User.startSession.mockResolvedValue({
                withTransaction: jest.fn().mockRejectedValue(new Error('Transaction failed')),
                endSession: jest.fn()
            });

            const res = await request(app)
                .post('/import/full')
                .attach('file', Buffer.from('mock zip content'), mockFile.originalname)
                .expect(500);

            expect(res.body.message).toContain('Error during import');
            expect(Progress.findByIdAndUpdate).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ status: 'failed' })
            );
        });

        it('should clean up temporary files after import', async () => {
            await request(app)
                .post('/import/full')
                .attach('file', Buffer.from('mock zip content'), mockFile.originalname);

            expect(fs.promises.rm).toHaveBeenCalled();
            expect(fs.promises.unlink).toHaveBeenCalled();
        });

        it('should update progress throughout import process', async () => {
            await request(app)
                .post('/import/full')
                .attach('file', Buffer.from('mock zip content'), mockFile.originalname);

            expect(Progress.create).toHaveBeenCalled();
            expect(Progress.findByIdAndUpdate).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ status: 'completed' })
            );
        });
    });
});