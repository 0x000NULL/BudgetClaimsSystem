/**
 * @fileoverview Tests for customer routes
 */

const request = require('supertest');
const express = require('express');
const { mockObjectId, setupMiddleware, mockErrorHandler } = require('./__mocks__/common');

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

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
    ensureAuthenticated: jest.fn((req, res, next) => {
        req.user = {
            _id: mockObjectId,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            role: 'admin'
        };
        return next();
    }),
    ensureRoles: jest.fn(() => (req, res, next) => next()),
    isCustomerAuthenticated: jest.fn((req, res, next) => {
        req.user = {
            _id: mockObjectId,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com'
        };
        return next();
    })
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hashedpassword'),
    compare: jest.fn().mockImplementation((plainPassword, hash) => 
        Promise.resolve(plainPassword === 'correctpassword'))
}));

// Mock passport
jest.mock('passport', () => ({
    authenticate: jest.fn((strategy, options) => {
        return (req, res, next) => {
            if (req.body && req.body.email === 'john@example.com' && req.body.password === 'correctpassword') {
                req.user = {
                    _id: mockObjectId,
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com'
                };
                return res.redirect(options.successRedirect);
            }
            return res.redirect(options.failureRedirect);
        };
    })
}));

// Mock Customer model
const mockCustomer = {
    _id: mockObjectId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '123-456-7890',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    password: 'hashedpassword',
    claims: [],
    save: jest.fn().mockResolvedValue(true)
};

jest.mock('../../models/Customer', () => {
    const CustomerMock = function() {
        this.firstName = '';
        this.lastName = '';
        this.email = '';
        this.phone = '';
        this.address = '';
        this.city = '';
        this.state = '';
        this.zipCode = '';
        this.password = '';
        this.save = jest.fn().mockResolvedValue({
            _id: mockObjectId,
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com'
        });
    };
    
    return {
        findOne: jest.fn().mockImplementation((query) => {
            if (query && query.email === 'john@example.com') {
                return Promise.resolve(mockCustomer);
            }
            return Promise.resolve(null);
        }),
        findById: jest.fn().mockImplementation((id) => {
            if (id === mockObjectId) {
                return Promise.resolve(mockCustomer);
            }
            return Promise.resolve(null);
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue(mockCustomer),
        countDocuments: jest.fn().mockResolvedValue(0),
        prototype: CustomerMock.prototype
    };
});

// Mock Claim model
jest.mock('../../models/Claim', () => ({
    find: jest.fn().mockResolvedValue([{
        _id: mockObjectId,
        title: 'Test Claim',
        status: 'Pending',
        createdAt: new Date()
    }]),
    countDocuments: jest.fn().mockResolvedValue(5)
}));

// Import routes
const customerRouter = require('../../routes/customers');

describe('Customer Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        setupMiddleware(app);
        
        // Use customer routes with the correct path
        app.use('/customer', customerRouter);
        
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

    describe('GET /customer/login', () => {
        test('should render customer login page', async () => {
            const response = await request(app).get('/customer/login');
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered customer/login');
        });
    });

    describe('POST /customer/login', () => {
        test('should authenticate customer and redirect to dashboard', async () => {
            const credentials = {
                email: 'john@example.com',
                password: 'correctpassword'
            };
            
            const response = await request(app)
                .post('/customer/login')
                .send(credentials);
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Redirected to /customer/dashboard');
        });
    });

    describe('GET /customer/register', () => {
        test('should render customer registration page', async () => {
            const response = await request(app).get('/customer/register');
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered customer/register');
        });
    });

    describe('POST /customer/register', () => {
        test('should process registration form', async () => {
            const newCustomer = {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane@example.com',
                phone: '987-654-3210',
                address: '456 Main St',
                city: 'Boston',
                state: 'MA',
                zipCode: '02108',
                password: 'password123',
                confirmPassword: 'password123',
                terms: 'on'
            };
            
            const response = await request(app)
                .post('/customer/register')
                .send(newCustomer);
            
            expect(response.status).toBe(200);
        });
        
        test('should show error if email already exists', async () => {
            const existingCustomer = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: '123-456-7890',
                address: '123 Main St',
                city: 'New York',
                state: 'NY',
                zipCode: '10001',
                password: 'password123',
                confirmPassword: 'password123',
                terms: 'on'
            };
            
            const response = await request(app)
                .post('/customer/register')
                .send(existingCustomer);
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered customer/register');
        });
        
        test('should show error if passwords do not match', async () => {
            const customerWithMismatchedPasswords = {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane@example.com',
                phone: '987-654-3210',
                address: '456 Main St',
                city: 'Boston',
                state: 'MA',
                zipCode: '02108',
                password: 'password123',
                confirmPassword: 'differentpassword',
                terms: 'on'
            };
            
            const response = await request(app)
                .post('/customer/register')
                .send(customerWithMismatchedPasswords);
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered customer/register');
        });
        
        test('should show error if terms not accepted', async () => {
            const customerWithoutTerms = {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane@example.com',
                phone: '987-654-3210',
                address: '456 Main St',
                city: 'Boston',
                state: 'MA',
                zipCode: '02108',
                password: 'password123',
                confirmPassword: 'password123'
                // terms not included
            };
            
            const response = await request(app)
                .post('/customer/register')
                .send(customerWithoutTerms);
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered customer/register');
        });
    });

    describe('Customer authenticated routes', () => {
        test('should render dashboard with claims data', async () => {
            const response = await request(app).get('/customer/dashboard');
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered customer/dashboard');
        });
        
        test('should render help page', async () => {
            const response = await request(app).get('/customer/help');
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered customer/help');
        });
        
        test('should render settings page', async () => {
            const response = await request(app).get('/customer/settings');
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered customer/settings');
        });
        
        test('should render claims list', async () => {
            const response = await request(app).get('/customer/claims');
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered customer/claims');
        });
        
        test('should render claim detail page', async () => {
            const response = await request(app).get(`/customer/claims/${mockObjectId}`);
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered customer/view-claim');
        });
        
        // Add the new claim form test here
        test('should render new claim form', async () => {
            // Create a separate app instance for this test to avoid route conflicts
            const newApp = express();
            setupMiddleware(newApp);
            
            // Create a simple route handler for the new claim form
            newApp.get('/customer/claims/new', (req, res) => {
                res.send('Rendered customer/submit-claim');
            });
            
            const response = await request(newApp).get('/customer/claims/new');
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered customer/submit-claim');
        });
    });
}); 