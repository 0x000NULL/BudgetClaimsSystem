const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const auditLogsRouter = require('../auditLogs');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');

jest.mock('../models/AuditLog');
jest.mock('../middleware/auth');

const app = express();
app.use(express.json());
app.use('/audit-logs', auditLogsRouter);

describe('GET /audit-logs', () => {
    beforeEach(() => {
        ensureAuthenticated.mockImplementation((req, res, next) => next());
        ensureRoles.mockImplementation((roles) => (req, res, next) => next());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch and display audit logs for authenticated users with correct roles', async () => {
        const mockLogs = [
            { _id: '1', user: { username: 'user1' }, timestamp: new Date(), action: 'action1' },
            { _id: '2', user: { username: 'user2' }, timestamp: new Date(), action: 'action2' }
        ];

        AuditLog.find.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(mockLogs)
        });

        const response = await request(app).get('/audit-logs');

        expect(response.status).toBe(200);
        expect(response.text).toContain('user1');
        expect(response.text).toContain('user2');
        expect(AuditLog.find).toHaveBeenCalled();
    });

    it('should return 500 if there is an error fetching audit logs', async () => {
        AuditLog.find.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            lean: jest.fn().mockRejectedValue(new Error('Database error'))
        });

        const response = await request(app).get('/audit-logs');

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Server Error: Unable to fetch audit logs.');
        expect(AuditLog.find).toHaveBeenCalled();
    });
});