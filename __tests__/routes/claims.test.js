const request = require('supertest');
const express = require('express');

// Mock environment variables before any imports
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'testpass';
process.env.NODE_ENV = 'test';

// Create mock ObjectId before mocking
const mockObjectId = '507f1f77bcf86cd799439011';

// Mock all external dependencies first
jest.mock('../../config/nodemailer', () => ({
    transporter: {
        sendMail: jest.fn().mockReturnValue({ messageId: 'test-id' })
    }
}));

jest.mock('../../notifications/notify', () => ({
    notifyNewClaim: jest.fn().mockReturnValue(),
    notifyClaimStatusUpdate: jest.fn().mockReturnValue(),
    notifyClaimAssigned: jest.fn().mockReturnValue(),
    notifyClaimUpdated: jest.fn().mockReturnValue()
}));

// Mock models with synchronous implementations
jest.mock('../../models/Status', () => ({
    find: jest.fn().mockReturnValue([{ name: 'pending' }]),
    findOne: jest.fn().mockReturnValue({ name: 'pending' })
}));

jest.mock('../../models/Location', () => ({
    find: jest.fn().mockReturnValue([{ name: 'test location' }]),
    findOne: jest.fn().mockReturnValue({ name: 'test location' })
}));

jest.mock('../../models/DamageType', () => ({
    find: jest.fn().mockReturnValue([{ name: 'test damage' }]),
    findOne: jest.fn().mockReturnValue({ name: 'test damage' })
}));

// Mock middleware with synchronous implementations
jest.mock('../../middleware/activityLogger', () => ({
    logActivity: jest.fn().mockImplementation((action) => (req, res, next) => next())
}));

jest.mock('../../middleware/auditLogger', () => ({
    logRequest: jest.fn()
}));

jest.mock('../../middleware/auth', () => ({
    ensureAuthenticated: jest.fn((req, res, next) => {
        req.user = { _id: mockObjectId, username: 'testuser', role: 'admin' };
        next();
    }),
    ensureRole: jest.fn(() => (req, res, next) => next()),
    ensureRoles: jest.fn(() => (req, res, next) => next())
}));

jest.mock('../../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

// Mock cache manager with synchronous implementation
const mockCache = {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn().mockReturnValue(true),
    del: jest.fn().mockReturnValue(true)
};

jest.mock('cache-manager', () => ({
    caching: jest.fn().mockReturnValue(mockCache)
}));

jest.mock('cache-manager-redis-store', () => ({
    redisStore: jest.fn()
}));

jest.mock('../../config/settings', () => ({
    uploadsPath: '/tmp/uploads',
    cache: {
        ttl: 60,
        max: 100
    }
}));

// Mock Claim model with synchronous responses
const mockClaim = {
    _id: mockObjectId,
    mva: 'TEST123',
    customerName: 'Test Customer',
    damagesTotal: 2000,
    status: ['pending'],
    createdAt: new Date(),
    updatedAt: new Date()
};

jest.mock('../../models/Claim', () => {
    const mockFind = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnValue([mockClaim]),
        exec: jest.fn().mockReturnValue([mockClaim])
    });

    const mockFindById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockReturnValue(mockClaim)
    });

    return {
        find: mockFind,
        findById: mockFindById,
        create: jest.fn().mockReturnValue(mockClaim),
        prototype: {
            save: jest.fn().mockReturnValue(mockClaim)
        }
    };
});

const Claim = require('../../models/Claim');
const claimsRouter = require('../../routes/claims');

describe('Claims Routes', () => {
    let app;
    let server;

    beforeAll(() => {
        jest.clearAllMocks();
        // Increase timeout for all tests in this suite
        jest.setTimeout(300000); // 5 minutes
    });

    afterAll(() => {
        jest.resetModules();
    });

    beforeEach(() => {
        app = express();
        app.use(express.json());
        
        // Add error handling middleware
        app.use((err, req, res, next) => {
            console.error('Error:', err);
            res.status(500).json({ error: err.message });
        });

        // Add basic middleware
        app.use((req, res, next) => {
            req.app = {
                locals: {
                    uploadsPath: '/tmp/uploads',
                    cache: mockCache
                }
            };
            next();
        });

        app.use('/claims', claimsRouter);
        server = app.listen(0); // Start server on random port
    });

    afterEach((done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    describe('GET /claims', () => {
        test('should return all claims', async () => {
            const response = await request(app)
                .get('/claims')
                .set('Accept', 'application/json')
                .expect(200);

            expect(response.type).toMatch(/json/);
            expect(Array.isArray(response.body)).toBeTruthy();
            expect(response.body.length).toBe(1);
            expect(response.body[0].mva).toBe('TEST123');
        });
    });

    describe('POST /claims', () => {
        test('should create a new claim', async () => {
            const newClaim = {
                mva: 'NEW123',
                customerName: 'New Customer',
                damagesTotal: 3000,
                status: ['pending']
            };

            const response = await request(app)
                .post('/claims')
                .send(newClaim)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.claim).toBeDefined();
        });

        test('should handle errors when creating a claim', async () => {
            const saveSpy = jest.spyOn(Claim.prototype, 'save')
                .mockImplementation(() => Promise.reject(new Error('Database error')));

            const newClaim = {
                mva: 'NEW123',
                customerName: 'New Customer',
                damagesTotal: 3000,
                status: ['pending']
            };

            const response = await request(app)
                .post('/claims')
                .send(newClaim)
                .expect(500);

            expect(response.body.error).toBeDefined();
            saveSpy.mockRestore();
        });
    });

    describe('PUT /claims/:id', () => {
        test('should update an existing claim', async () => {
            const updateData = {
                customerName: 'Updated Customer',
                damagesTotal: 4000
            };

            const response = await request(app)
                .put(`/claims/${mockObjectId}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.claim.mva).toBe('TEST123');
        });
    });
}); 