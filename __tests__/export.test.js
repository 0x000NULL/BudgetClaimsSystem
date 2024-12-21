const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const User = require('../models/User');
const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const Settings = require('../models/Settings');
const EmailTemplate = require('../models/EmailTemplate');
const Status = require('../models/Status');
const Location = require('../models/Location');
const Progress = require('../models/Progress');
const exportRoutes = require('../routes/export');
const pinoLogger = require('../logger');

// Create Express app for testing
const app = express();

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('archiver');
jest.mock('../models/User');
jest.mock('../models/Claim');
jest.mock('../models/AuditLog');
jest.mock('../models/Settings');
jest.mock('../models/EmailTemplate');
jest.mock('../models/Status');
jest.mock('../models/Location');
jest.mock('../models/Progress');
jest.mock('../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

// Setup Express middleware and routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/export', exportRoutes);

describe('Export Routes', () => {
    let mockUser;
    let mockArchive;
    let mockWriteStream;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock user
        mockUser = {
            _id: 'testUserId',
            email: 'test@example.com',
            role: 'admin',
            hasRole: jest.fn().mockReturnValue(true)
        };

        // Setup mock write stream
        mockWriteStream = {
            write: jest.fn().mockImplementation((data, cb) => cb()),
            on: jest.fn(),
            once: jest.fn(),
            emit: jest.fn(),
            end: jest.fn()
        };

        // Setup mock archive
        mockArchive = {
            pipe: jest.fn(),
            append: jest.fn(),
            file: jest.fn(),
            finalize: jest.fn().mockResolvedValue(undefined),
            on: jest.fn(),
            pointer: jest.fn().mockReturnValue(1024)
        };

        // Mock file system operations
        fs.createWriteStream.mockReturnValue(mockWriteStream);
        fs.createReadStream.mockReturnValue({
            pipe: jest.fn().mockReturnValue(mockWriteStream),
            on: jest.fn().mockImplementation((event, handler) => {
                if (event === 'end') handler();
                return this;
            })
        });
        fs.promises = {
            mkdir: jest.fn().mockResolvedValue(undefined),
            writeFile: jest.fn().mockResolvedValue(undefined),
            readFile: jest.fn().mockResolvedValue('test data'),
            rm: jest.fn().mockResolvedValue(undefined)
        };
        fs.existsSync.mockReturnValue(true);
        fs.statSync.mockReturnValue({ size: 1000 });

        // Mock archiver
        archiver.mockReturnValue(mockArchive);

        // Mock database operations
        const mockCursor = {
            next: jest.fn()
                .mockResolvedValueOnce({ toJSON: () => ({ id: 1 }) })
                .mockResolvedValueOnce({ toJSON: () => ({ id: 2 }) })
                .mockResolvedValue(null)
        };

        [User, Claim, AuditLog, Settings, EmailTemplate, Status, Location].forEach(Model => {
            Model.find.mockReturnValue({ cursor: () => mockCursor });
            Model.countDocuments.mockResolvedValue(2);
        });

        // Mock Progress model
        Progress.create.mockResolvedValue({ id: 'progress-123' });
        Progress.findOneAndUpdate.mockResolvedValue({});
    });

    describe('GET /export/full', () => {
        it('should handle successful full export', async () => {
            const res = await request(app)
                .get('/export/full')
                .set('user', mockUser)
                .expect(200);

            expect(res.header['content-type']).toBe('application/zip');
            expect(res.header['content-disposition']).toMatch(/^attachment; filename="export-.*\.zip"$/);
            
            expect(Progress.create).toHaveBeenCalledWith(expect.objectContaining({
                type: 'export',
                status: 'started'
            }));

            expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                action: 'full_export',
                user: mockUser._id.toString()
            }));

            expect(mockArchive.finalize).toHaveBeenCalled();
        });

        it('should handle unauthorized access', async () => {
            mockUser.role = 'user';
            mockUser.hasRole.mockReturnValue(false);

            const res = await request(app)
                .get('/export/full')
                .set('user', mockUser)
                .expect(403);

            expect(res.body).toEqual({
                success: false,
                message: 'Unauthorized. Admin access required.'
            });
        });

        it('should handle database errors', async () => {
            User.find.mockImplementation(() => {
                throw new Error('Database error');
            });

            const res = await request(app)
                .get('/export/full')
                .set('user', mockUser)
                .expect(500);

            expect(res.body).toEqual({
                success: false,
                message: 'Export failed'
            });
        });

        it('should handle archive creation errors', async () => {
            mockArchive.finalize.mockRejectedValue(new Error('Archive error'));

            const res = await request(app)
                .get('/export/full')
                .set('user', mockUser)
                .expect(500);

            expect(res.body).toEqual({
                success: false,
                message: 'Export failed'
            });
        });

        it('should handle file system errors', async () => {
            fs.promises.mkdir.mockRejectedValue(new Error('File system error'));

            const res = await request(app)
                .get('/export/full')
                .set('user', mockUser)
                .expect(500);

            expect(res.body).toEqual({
                success: false,
                message: 'Export failed'
            });
        });

        it('should clean up temporary files after export', async () => {
            await request(app)
                .get('/export/full')
                .set('user', mockUser);

            expect(fs.promises.rm).toHaveBeenCalled();
        });

        it('should update progress during export', async () => {
            await request(app)
                .get('/export/full')
                .set('user', mockUser);

            expect(Progress.create).toHaveBeenCalled();
            expect(Progress.findOneAndUpdate).toHaveBeenCalled();
        });

        it('should handle client disconnect', async () => {
            const req = request(app).get('/export/full').set('user', mockUser);
            req.abort();

            expect(fs.promises.rm).toHaveBeenCalled();
        });

        it('should include all required collections', async () => {
            await request(app)
                .get('/export/full')
                .set('user', mockUser);

            const collections = [
                'users.json',
                'claims.json',
                'audit_logs.json',
                'settings.json',
                'email_templates.json',
                'statuses.json',
                'locations.json'
            ];

            collections.forEach(filename => {
                expect(mockArchive.file).toHaveBeenCalledWith(
                    expect.stringContaining(filename),
                    expect.any(Object)
                );
            });
        });

        it('should include metadata file', async () => {
            await request(app)
                .get('/export/full')
                .set('user', mockUser);

            expect(mockArchive.append).toHaveBeenCalledWith(
                expect.stringContaining('"version":"1.0"'),
                { name: 'metadata.json' }
            );
        });
    });
});