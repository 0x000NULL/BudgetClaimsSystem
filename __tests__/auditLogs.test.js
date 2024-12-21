const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const auditLogsRouter = require('../routes/auditLogs');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const pinoLogger = require('../logger');

// Create Express app for testing
const app = express();

// Mock dependencies
jest.mock('../models/AuditLog');
jest.mock('../middleware/auth');
jest.mock('../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

// Setup Express middleware and routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use('/audit-logs', auditLogsRouter);

describe('Audit Logs Routes', () => {
    let mockUser;
    let mockLogs;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock user
        mockUser = {
            id: 'testUserId',
            email: 'test@example.com',
            role: 'admin',
            username: 'testuser'
        };

        // Setup mock audit logs
        mockLogs = [
            {
                _id: 'log1',
                user: { _id: 'user1', username: 'user1' },
                action: 'Created claim',
                details: 'Created new claim MVA123',
                timestamp: new Date('2024-01-01T10:00:00Z')
            },
            {
                _id: 'log2',
                user: { _id: 'user2', username: 'user2' },
                action: 'Updated claim',
                details: 'Updated claim MVA124',
                timestamp: new Date('2024-01-01T11:00:00Z')
            }
        ];

        // Setup default auth middleware behavior
        ensureAuthenticated.mockImplementation((req, res, next) => {
            req.user = mockUser;
            next();
        });
        ensureRoles.mockImplementation((roles) => (req, res, next) => next());

        // Setup mock AuditLog.find chain
        AuditLog.find.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(mockLogs)
        });
    });

    describe('GET /audit-logs', () => {
        it('should render audit logs page for authorized users', async () => {
            const res = await request(app)
                .get('/audit-logs')
                .expect(200);

            expect(res.text).toContain('Audit Logs');
            expect(AuditLog.find).toHaveBeenCalled();
            expect(pinoLogger.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Audit logs fetched successfully'
                })
            );
        });

        it('should handle unauthorized access', async () => {
            ensureRoles.mockImplementation(() => (req, res, next) => {
                res.status(403).json({ error: 'Unauthorized' });
            });

            await request(app)
                .get('/audit-logs')
                .expect(403);
        });

        it('should properly populate user data', async () => {
            const res = await request(app)
                .get('/audit-logs')
                .expect(200);

            expect(AuditLog.find().populate).toHaveBeenCalledWith(
                { path: 'user', select: 'username' }
            );
        });

        it('should sort logs by timestamp in descending order', async () => {
            const res = await request(app)
                .get('/audit-logs')
                .expect(200);

            expect(AuditLog.find().sort).toHaveBeenCalledWith(
                { timestamp: -1 }
            );
        });

        it('should handle database errors', async () => {
            AuditLog.find.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockRejectedValue(new Error('Database error'))
            });

            const res = await request(app)
                .get('/audit-logs')
                .expect(500);

            expect(res.body.message).toBe('Server Error: Unable to fetch audit logs.');
            expect(pinoLogger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Error fetching audit logs',
                    error: expect.any(Error)
                })
            );
        });

        it('should handle empty audit logs', async () => {
            AuditLog.find.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([])
            });

            const res = await request(app)
                .get('/audit-logs')
                .expect(200);

            expect(res.text).toContain('No audit logs found');
        });

        it('should format timestamps correctly', async () => {
            const res = await request(app)
                .get('/audit-logs')
                .expect(200);

            expect(res.text).toContain('2024-01-01');
            expect(res.text).toContain('10:00:00');
        });

        it('should display user actions correctly', async () => {
            const res = await request(app)
                .get('/audit-logs')
                .expect(200);

            expect(res.text).toContain('Created claim');
            expect(res.text).toContain('Updated claim');
            expect(res.text).toContain('MVA123');
            expect(res.text).toContain('MVA124');
        });

        it('should handle missing user data', async () => {
            const logsWithMissingUser = [
                {
                    _id: 'log1',
                    action: 'System action',
                    details: 'Automated task',
                    timestamp: new Date()
                }
            ];

            AuditLog.find.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(logsWithMissingUser)
            });

            const res = await request(app)
                .get('/audit-logs')
                .expect(200);

            expect(res.text).toContain('System');
            expect(res.text).toContain('Automated task');
        });
    });
});