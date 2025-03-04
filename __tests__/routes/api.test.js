/**
 * @fileoverview Tests for API routes
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { mockObjectId, setupMiddleware, mockAuthMiddleware, mockErrorHandler, mockEnsureRole } = require('./__mocks__/common');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';

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

// Mock User model
const mockUser = {
    _id: mockObjectId,
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    password: 'hashedpassword',
    comparePassword: jest.fn().mockImplementation((password) => {
        return Promise.resolve(password === 'password');
    })
};

jest.mock('../../models/User', () => ({
    findOne: jest.fn().mockImplementation((query) => {
        if (query && query.email === 'test@example.com') {
            return Promise.resolve(mockUser);
        }
        return Promise.resolve(null);
    }),
    findById: jest.fn().mockImplementation((id) => {
        if (id === mockObjectId) {
            return Promise.resolve(mockUser);
        }
        return Promise.resolve(null);
    })
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
    compare: jest.fn().mockImplementation((password, hash) => {
        return Promise.resolve(password === 'password');
    })
}));

// Mock json web token
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('valid-token'),
    verify: jest.fn().mockImplementation((token, secret) => {
        if (token === 'valid-token') {
            return { id: mockObjectId };
        }
        throw new Error('Invalid token');
    })
}));

// Mock Claim model
const mockClaim = {
    _id: 'test-claim-id',
    mva: 'TEST123',
    customerName: 'Test Customer',
    damagesTotal: 2000,
    status: ['pending'],
    location: 'Location 1',
    damageType: 'Damage Type 1',
    createdAt: new Date(),
    updatedAt: new Date()
};

jest.mock('../../models/Claim', () => ({
    find: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockClaim])
    }),
    findById: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockClaim)
    }),
    create: jest.fn().mockResolvedValue(mockClaim),
    findByIdAndUpdate: jest.fn().mockResolvedValue(mockClaim),
    findByIdAndDelete: jest.fn().mockResolvedValue(true)
}));

// Import routes
const apiRouter = require('../../routes/api');

describe('API Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        setupMiddleware(app);
        mockErrorHandler(app);
        
        app.use('/api', apiRouter);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/login', () => {
        test('should return token with valid credentials', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'password'
            };
            
            const response = await request(app)
                .post('/api/auth/login')
                .send(credentials);
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(jwt.sign).toHaveBeenCalled();
        });
        
        test('should return 401 with invalid credentials', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };
            
            const response = await request(app)
                .post('/api/auth/login')
                .send(credentials);
            
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/auth/verify', () => {
        test('should return user info with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/verify')
                .set('Authorization', 'Bearer valid-token');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('user');
        });
        
        test('should return 401 with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/verify')
                .set('Authorization', 'Bearer invalid-token');
            
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/claims', () => {
        test('should return list of claims', async () => {
            const response = await request(app)
                .get('/api/claims')
                .set('Authorization', 'Bearer valid-token');
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/claims/:id', () => {
        test('should return claim by ID', async () => {
            const response = await request(app)
                .get('/api/claims/test-claim-id')
                .set('Authorization', 'Bearer valid-token');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('_id', 'test-claim-id');
        });
        
        test('should return 404 for non-existent claim', async () => {
            const response = await request(app)
                .get('/api/claims/nonexistentid')
                .set('Authorization', 'Bearer valid-token');
            
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/claims', () => {
        test('should create a new claim', async () => {
            const newClaimData = {
                mva: 'NEW123',
                customerName: 'New Customer',
                damagesTotal: 3000,
                status: 'pending',
                location: 'Location 1',
                damageType: 'Damage Type 1'
            };
            
            const response = await request(app)
                .post('/api/claims')
                .set('Authorization', 'Bearer valid-token')
                .send(newClaimData);
            
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
        });
        
        test('should return 400 with invalid data', async () => {
            // Mock create to throw validation error
            const createMock = require('../../models/Claim').create;
            createMock.mockRejectedValueOnce(new Error('Validation failed'));
            
            const invalidClaimData = {
                // Missing required fields
                mva: 'NEW123'
            };
            
            const response = await request(app)
                .post('/api/claims')
                .set('Authorization', 'Bearer valid-token')
                .send(invalidClaimData);
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('PUT /api/claims/:id', () => {
        test('should update an existing claim', async () => {
            const updateData = {
                customerName: 'Updated Customer',
                damagesTotal: 4000
            };
            
            const response = await request(app)
                .put('/api/claims/test-claim-id')
                .set('Authorization', 'Bearer valid-token')
                .send(updateData);
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('_id');
        });
    });

    describe('DELETE /api/claims/:id', () => {
        test('should delete a claim', async () => {
            const response = await request(app)
                .delete('/api/claims/test-claim-id')
                .set('Authorization', 'Bearer valid-token');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
        });
    });

    describe('GET /api/users/profile', () => {
        test('should return current user profile', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', 'Bearer valid-token');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('name', 'Test User');
        });
    });
}); 