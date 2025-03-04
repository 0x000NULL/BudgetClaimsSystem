/**
 * @fileoverview Tests for audit logs routes
 */

const request = require('supertest');
const express = require('express');
const { mockObjectId, setupMiddleware, mockAuthMiddleware, mockErrorHandler } = require('./__mocks__/common');

// Mock environment variables
process.env.NODE_ENV = 'test';

// Mock dependencies
jest.mock('../../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

jest.mock('../../middleware/auth', () => ({
    ensureAuthenticated: jest.fn((req, res, next) => next()),
    ensureRoles: jest.fn(() => (req, res, next) => next())
}));

// Mock AuditLog model
const mockAuditLogs = [
    {
        _id: mockObjectId,
        user: {
            _id: 'userId1',
            username: 'testuser',
            email: 'user@example.com'
        },
        action: 'login',
        details: 'User logged in',
        timestamp: new Date('2024-01-01T10:00:00Z')
    },
    {
        _id: 'anotherObjectId',
        user: {
            _id: 'userId1',
            username: 'testuser',
            email: 'user@example.com'
        },
        action: 'view claim',
        details: 'User viewed claim details',
        timestamp: new Date('2024-01-01T11:00:00Z')
    }
];

jest.mock('../../models/AuditLog', () => ({
    find: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnValue(mockAuditLogs)
    })
}));

// Import routes
const auditLogsRouter = require('../../routes/auditLogs');

describe('Audit Logs Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        setupMiddleware(app);
        app.use(mockAuthMiddleware('admin'));
        
        app.use('/', auditLogsRouter);
        
        // Mock render and redirect
        app.response.render = jest.fn().mockImplementation(function(view, options) {
            this.send(`Rendered ${view}`);
        });
        
        app.response.redirect = jest.fn().mockImplementation(function(url) {
            this.send(`Redirected to ${url}`);
        });
        
        mockErrorHandler(app);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /', () => {
        test('should render audit logs page', async () => {
            const response = await request(app).get('/');
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered audit_logs');
        });
        
        test('should handle server error', async () => {
            // Mock AuditLog.find to throw an error
            require('../../models/AuditLog').find.mockImplementationOnce(() => {
                throw new Error('Database error');
            });
            
            const response = await request(app).get('/');
            
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('message');
        });
    });
}); 