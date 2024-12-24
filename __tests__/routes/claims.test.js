const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// Create mock ObjectId before mocking
const mockObjectId = '507f1f77bcf86cd799439011';

// Mock nodemailer configuration
jest.mock('../../config/nodemailer', () => ({
    transporter: {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
    }
}));

// Mock notifications
jest.mock('../../notifications/notify', () => ({
    notifyNewClaim: jest.fn().mockResolvedValue(),
    notifyClaimStatusUpdate: jest.fn().mockResolvedValue(),
    notifyClaimAssigned: jest.fn().mockResolvedValue(),
    notifyClaimUpdated: jest.fn().mockResolvedValue()
}));

// Mock models
jest.mock('../../models/Claim', () => {
    const mockClaim = {
        _id: mockObjectId,
        mva: 'TEST123',
        customerName: 'Test Customer',
        damagesTotal: 2000,
        status: ['pending'],
        save: jest.fn().mockResolvedValue(true),
        remove: jest.fn().mockResolvedValue(true)
    };

    return {
        find: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue([mockClaim]),
            exec: jest.fn().mockResolvedValue([mockClaim])
        })),
        findById: jest.fn().mockResolvedValue(mockClaim),
        prototype: {
            save: jest.fn().mockResolvedValue(mockClaim)
        },
        mockClaim,
        create: jest.fn().mockResolvedValue(mockClaim)
    };
});

jest.mock('../../models/Status');
jest.mock('../../models/Location');
jest.mock('../../models/DamageType');

// Mock middleware
jest.mock('../../middleware/activityLogger', () => ({
    logActivity: jest.fn().mockImplementation((action) => (req, res, next) => next())
}));

jest.mock('../../middleware/auditLogger', () => ({
    logRequest: jest.fn().mockImplementation((req, message, extra) => {})
}));

jest.mock('../../middleware/auth', () => ({
    isAuthenticated: jest.fn((req, res, next) => {
        req.user = {
            _id: mockObjectId,
            username: 'testuser',
            role: 'admin'
        };
        next();
    }),
    hasRole: jest.fn(() => (req, res, next) => next()),
    ensureAuthenticated: jest.fn((req, res, next) => {
        req.user = {
            _id: mockObjectId,
            username: 'testuser',
            role: 'admin'
        };
        next();
    }),
    ensureRole: jest.fn(() => (req, res, next) => next()),
    ensureRoles: jest.fn(() => (req, res, next) => next())
}));

// Mock logger
jest.mock('../../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

// Mock cache manager and Redis store
jest.mock('cache-manager', () => ({
    caching: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(true),
        del: jest.fn().mockResolvedValue(true)
    })
}));

jest.mock('cache-manager-redis-store', () => ({
    redisStore: {}
}));

// Mock settings
jest.mock('../../config/settings', () => ({
    uploadsPath: '/tmp/uploads'
}));

// Now require the models and routes after mocking
const Claim = require('../../models/Claim');
const claimsRouter = require('../../routes/claims');

describe('Claims Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use((req, res, next) => {
            req.app = {
                locals: {
                    uploadsPath: '/tmp/uploads'
                }
            };
            next();
        });
        app.use('/claims', claimsRouter);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /claims', () => {
        it('should return all claims', async () => {
            const res = await request(app)
                .get('/claims')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBeTruthy();
            expect(res.body.length).toBe(1);
            expect(res.body[0].mva).toBe('TEST123');
        });
    });

    describe('POST /claims', () => {
        it('should create a new claim', async () => {
            const newClaim = {
                mva: 'NEW123',
                customerName: 'New Customer',
                damagesTotal: 3000,
                status: ['pending']
            };

            const res = await request(app)
                .post('/claims')
                .send(newClaim)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.claim.mva).toBe('TEST123');
        }, 30000);
    });

    describe('PUT /claims/:id', () => {
        it('should update an existing claim', async () => {
            const updateData = {
                customerName: 'Updated Customer',
                damagesTotal: 4000
            };

            const res = await request(app)
                .put(`/claims/${mockObjectId}`)
                .send(updateData)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.claim.mva).toBe('TEST123');
        });
    });
}); 