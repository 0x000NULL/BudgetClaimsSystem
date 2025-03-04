/**
 * @fileoverview Tests for dashboard routes
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

// Mock Claim model for dashboard stats
const mockClaims = [
    {
        _id: mockObjectId,
        mva: 'CLAIM1',
        customerName: 'Customer 1',
        damagesTotal: 2000,
        status: ['pending'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
    },
    {
        _id: 'anotherObjectId',
        mva: 'CLAIM2',
        customerName: 'Customer 2',
        damagesTotal: 3000,
        status: ['approved'],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date()
    }
];

jest.mock('../../models/Claim', () => ({
    find: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockClaims)
    }),
    countDocuments: jest.fn().mockImplementation((query) => {
        if (query.status && query.status.includes('pending')) {
            return Promise.resolve(1);
        } else if (query.status && query.status.includes('approved')) {
            return Promise.resolve(1);
        } else {
            return Promise.resolve(2);
        }
    })
}));

// Mock User model
jest.mock('../../models/User', () => ({
    countDocuments: jest.fn().mockResolvedValue(3),
    find: jest.fn().mockResolvedValue([
        { _id: mockObjectId, name: 'Test User', email: 'test@example.com', role: 'admin' }
    ])
}));

// Mock cache manager
const mockCache = {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn().mockReturnValue(true),
    del: jest.fn().mockReturnValue(true)
};

jest.mock('cache-manager', () => ({
    caching: jest.fn().mockReturnValue(mockCache)
}));

// Import routes
const dashboardRouter = require('../../routes/dashboard');

describe('Dashboard Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        setupMiddleware(app);
        mockErrorHandler(app);
        
        // Mock app.locals for cache
        app.locals = {
            cache: mockCache
        };
        
        app.use('/dashboard', dashboardRouter);
        
        // Mock render and redirect
        app.response.render = jest.fn().mockImplementation(function(view, options) {
            this.send(`Rendered ${view}`);
        });
        
        app.response.redirect = jest.fn().mockImplementation(function(url) {
            this.send(`Redirected to ${url}`);
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /dashboard', () => {
        test('should render dashboard with stats for admin', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get('/dashboard');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered dashboard/index');
        });
        
        test('should render dashboard with stats for manager', async () => {
            app.use(mockAuthMiddleware('manager'));
            
            const response = await request(app).get('/dashboard');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered dashboard/index');
        });
        
        test('should render dashboard with stats for employee', async () => {
            app.use(mockAuthMiddleware('employee'));
            
            const response = await request(app).get('/dashboard');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered dashboard/index');
        });
        
        test('should use cached data if available', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            // Mock cache hit
            mockCache.get.mockResolvedValueOnce({
                totalClaims: 10,
                pendingClaims: 5,
                approvedClaims: 4,
                totalUsers: 6,
                recentClaims: []
            });
            
            const response = await request(app).get('/dashboard');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered dashboard/index');
            expect(mockCache.get).toHaveBeenCalledWith('dashboard_stats_admin');
        });
    });

    describe('GET /dashboard/analytics', () => {
        test('should render analytics page', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get('/dashboard/analytics');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered dashboard/analytics');
        });
    });

    describe('GET /dashboard/refresh', () => {
        test('should clear cache and redirect to dashboard', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get('/dashboard/refresh');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Redirected to /dashboard');
            expect(mockCache.del).toHaveBeenCalled();
        });
    });
}); 