/**
 * @fileoverview Tests for reports routes
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

// Mock Claim model for reports
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
    aggregate: jest.fn().mockImplementation((pipeline) => {
        // Simple aggregation mock that returns predefined data based on pipeline
        if (pipeline.some(stage => stage.$group)) {
            return Promise.resolve([
                { _id: 'pending', count: 1 },
                { _id: 'approved', count: 1 }
            ]);
        } else {
            return Promise.resolve(mockClaims);
        }
    })
}));

// Mock Chart.js or other visualization libraries if used
jest.mock('chart.js', () => ({}), { virtual: true });

// Import routes
const reportsRouter = require('../../routes/reports');

describe('Reports Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        setupMiddleware(app);
        mockErrorHandler(app);
        
        app.use('/reports', reportsRouter);
        
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

    describe('GET /reports', () => {
        test('should render reports dashboard', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get('/reports');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered reports/index');
        });
    });

    describe('GET /reports/status', () => {
        test('should render status report', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get('/reports/status');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered reports/status');
        });
    });

    describe('GET /reports/financial', () => {
        test('should render financial report', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get('/reports/financial');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered reports/financial');
        });
    });

    describe('GET /reports/monthly', () => {
        test('should render monthly report', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get('/reports/monthly');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered reports/monthly');
        });
    });

    describe('POST /reports/generate', () => {
        test('should generate custom report and render result', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const reportParams = {
                startDate: '2024-01-01',
                endDate: '2024-03-31',
                type: 'status',
                format: 'chart'
            };
            
            const response = await request(app)
                .post('/reports/generate')
                .send(reportParams);
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered reports/result');
        });
    });
}); 