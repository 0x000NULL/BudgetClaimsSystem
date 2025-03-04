/**
 * @fileoverview Tests for claims routes
 */

const request = require('supertest');
const express = require('express');
const { 
    mockObjectId, 
    setupMiddleware, 
    mockAuthMiddleware, 
    mockErrorHandler,
    mockLogActivity
} = require('./__mocks__/common');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'testpass';

// Mock dependencies
jest.mock('../../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

jest.mock('../../middleware/auth', () => ({
    ensureAuthenticated: jest.fn((req, res, next) => next()),
    ensureRoles: jest.fn(() => (req, res, next) => next()),
    ensureRole: jest.fn(() => (req, res, next) => next())
}));

jest.mock('../../middleware/activityLogger', () => {
    return {
        logActivity: jest.fn().mockImplementation((action) => (req, res, next) => next())
    };
});

jest.mock('../../middleware/auditLogger', () => ({
    logRequest: jest.fn()
}));

// Mock notification services
jest.mock('../../notifications/notify', () => ({
    notifyNewClaim: jest.fn().mockResolvedValue(true),
    notifyClaimStatusUpdate: jest.fn().mockResolvedValue(true),
    notifyClaimAssigned: jest.fn().mockResolvedValue(true),
    notifyClaimUpdated: jest.fn().mockResolvedValue(true)
}));

// Mock email transport
jest.mock('../../config/nodemailer', () => ({
    transporter: {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
    }
}));

// Mock models
jest.mock('../../models/Status', () => ({
    find: jest.fn().mockResolvedValue([
        { _id: 'status1', name: 'pending', description: 'Pending status' },
        { _id: 'status2', name: 'approved', description: 'Approved status' },
        { _id: 'status3', name: 'rejected', description: 'Rejected status' }
    ]),
    findOne: jest.fn().mockResolvedValue({ _id: 'status1', name: 'pending', description: 'Pending status' })
}));

jest.mock('../../models/Location', () => ({
    find: jest.fn().mockResolvedValue([
        { _id: 'loc1', name: 'Location 1' },
        { _id: 'loc2', name: 'Location 2' }
    ]),
    findOne: jest.fn().mockResolvedValue({ _id: 'loc1', name: 'Location 1' })
}));

jest.mock('../../models/DamageType', () => ({
    find: jest.fn().mockResolvedValue([
        { _id: 'damage1', name: 'Damage Type 1' },
        { _id: 'damage2', name: 'Damage Type 2' }
    ]),
    findOne: jest.fn().mockResolvedValue({ _id: 'damage1', name: 'Damage Type 1' })
}));

// Mock Claim model
const mockClaim = {
    _id: mockObjectId,
    mva: 'TEST123',
    customerName: 'Test Customer',
    damagesTotal: 2000,
    status: ['pending'],
    location: 'Location 1',
    damageType: 'Damage Type 1',
    assignedTo: mockObjectId,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true)
};

jest.mock('../../models/Claim', () => {
    return {
        find: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([mockClaim])
        }),
        findById: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockClaim)
        }),
        findOne: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockClaim)
        }),
        create: jest.fn().mockResolvedValue(mockClaim),
        findByIdAndUpdate: jest.fn().mockResolvedValue(mockClaim),
        findByIdAndDelete: jest.fn().mockResolvedValue(true)
    };
});

// Mock User model for assignees
jest.mock('../../models/User', () => ({
    find: jest.fn().mockResolvedValue([
        { _id: mockObjectId, name: 'Test User', email: 'test@example.com', role: 'admin' }
    ])
}));

// Import routes
const claimsRouter = require('../../routes/claims');

describe('Claims Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        setupMiddleware(app);
        mockErrorHandler(app);
        
        // Mock multer for file uploads
        app.use((req, res, next) => {
            req.files = {};
            next();
        });
        
        app.use('/claims', claimsRouter);
        
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

    describe('GET /claims', () => {
        test('should render claims list page', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get('/claims');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered claims/index');
        });
    });

    describe('GET /claims/new', () => {
        test('should render new claim form', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get('/claims/new');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered claims/new');
        });
    });

    describe('POST /claims', () => {
        test('should create a new claim and redirect', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const newClaimData = {
                mva: 'NEW123',
                customerName: 'New Customer',
                damagesTotal: 3000,
                status: 'pending',
                location: 'Location 1',
                damageType: 'Damage Type 1'
            };
            
            const response = await request(app)
                .post('/claims')
                .send(newClaimData);
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Redirected to /claims');
        });
    });

    describe('GET /claims/:id', () => {
        test('should render claim details page', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get(`/claims/${mockObjectId}`);
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered claims/view');
        });
        
        test('should return 404 if claim not found', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            // Mock findById to return null for this test
            const findByIdMock = require('../../models/Claim').findById;
            findByIdMock.mockReturnValueOnce({
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(null)
            });
            
            const response = await request(app).get('/claims/nonexistentid');
            expect(response.status).toBe(404);
        });
    });

    describe('GET /claims/:id/edit', () => {
        test('should render edit claim form', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get(`/claims/${mockObjectId}/edit`);
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered claims/edit');
        });
    });

    describe('PUT /claims/:id', () => {
        test('should update claim and redirect', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const updateData = {
                customerName: 'Updated Customer',
                damagesTotal: 4000,
                status: 'approved'
            };
            
            const response = await request(app)
                .put(`/claims/${mockObjectId}`)
                .send(updateData);
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Redirected to /claims');
        });
    });

    describe('DELETE /claims/:id', () => {
        test('should delete claim and redirect', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).delete(`/claims/${mockObjectId}`);
            expect(response.status).toBe(200);
            expect(response.text).toContain('Redirected to /claims');
        });
    });

    describe('POST /claims/:id/assign', () => {
        test('should assign claim to user and redirect', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const assignData = {
                assignedTo: mockObjectId
            };
            
            const response = await request(app)
                .post(`/claims/${mockObjectId}/assign`)
                .send(assignData);
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Redirected to /claims');
        });
    });

    describe('POST /claims/:id/status', () => {
        test('should update claim status and redirect', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const statusData = {
                status: 'approved'
            };
            
            const response = await request(app)
                .post(`/claims/${mockObjectId}/status`)
                .send(statusData);
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Redirected to /claims');
        });
    });
}); 