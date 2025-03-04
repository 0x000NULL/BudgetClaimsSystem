/**
 * @fileoverview Tests for user management routes
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
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

// Mock User model
const mockUser = {
    _id: mockObjectId,
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    password: 'hashedpassword',
    save: jest.fn().mockResolvedValue(true)
};

jest.mock('../../models/User', () => {
    return {
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
        }),
        find: jest.fn().mockResolvedValue([mockUser]),
        findByIdAndDelete: jest.fn().mockResolvedValue(true)
    };
});

// Mock bcrypt
jest.mock('bcryptjs', () => ({
    compare: jest.fn().mockImplementation((password, hash) => {
        return Promise.resolve(password === 'password');
    }),
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hashedpassword')
}));

// Mock passport
jest.mock('passport', () => ({
    use: jest.fn(),
    serializeUser: jest.fn(),
    deserializeUser: jest.fn(),
    authenticate: jest.fn().mockImplementation(() => {
        return (req, res, next) => {
            if (req.body.email === 'test@example.com' && req.body.password === 'password') {
                req.user = mockUser;
                return next();
            }
            req.flash('error_msg', 'Invalid credentials');
            return res.redirect('/login');
        };
    }),
    initialize: jest.fn().mockReturnValue((req, res, next) => next()),
    session: jest.fn().mockReturnValue((req, res, next) => next())
}));

// Import the route
const usersRouter = require('../../routes/users');

describe('Users Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        setupMiddleware(app);
        mockErrorHandler(app);
        app.use('/', usersRouter);
        
        // Mock render method
        app.response.render = jest.fn().mockImplementation(function(view, options) {
            this.send(`Rendered ${view}`);
        });
        
        // Mock redirect method
        app.response.redirect = jest.fn().mockImplementation(function(url) {
            this.send(`Redirected to ${url}`);
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /register', () => {
        test('should render register page', async () => {
            const response = await request(app).get('/register');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered register');
        });
    });

    describe('POST /register', () => {
        test('should register a new user and redirect to login', async () => {
            const newUser = {
                name: 'New User',
                email: 'new@example.com',
                password: 'password123',
                role: 'employee'
            };

            const response = await request(app)
                .post('/register')
                .send(newUser);

            expect(response.status).toBe(200);
            expect(response.text).toContain('Redirected to /login');
        });

        test('should show error if email already exists', async () => {
            const existingUser = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                role: 'employee'
            };

            const response = await request(app)
                .post('/register')
                .send(existingUser);

            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered register');
        });
    });

    describe('GET /login', () => {
        test('should render login page', async () => {
            const response = await request(app).get('/login');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered login');
        });
    });

    describe('POST /login', () => {
        test('should login user with correct credentials', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'password'
            };

            const response = await request(app)
                .post('/login')
                .send(credentials);

            expect(response.status).toBe(200);
            expect(response.text).toContain('Redirected to /dashboard');
        });

        test('should reject login with incorrect credentials', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            const response = await request(app)
                .post('/login')
                .send(credentials);

            expect(response.status).toBe(200);
            expect(response.text).toContain('Redirected to /login');
        });
    });

    describe('GET /logout', () => {
        test('should logout user and redirect to login', async () => {
            // Mock req.logout
            app.use((req, res, next) => {
                req.logout = jest.fn((callback) => callback());
                next();
            });

            const response = await request(app).get('/logout');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Redirected to /login');
        });
    });

    describe('GET /user-management', () => {
        test('should render user management page for admin', async () => {
            // Add auth middleware mock
            app.use(mockAuthMiddleware('admin'));

            const response = await request(app).get('/user-management');
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered user_management');
        });
    });

    describe('GET /:id/edit', () => {
        test('should render edit user page for existing user', async () => {
            // Add auth middleware mock
            app.use(mockAuthMiddleware('admin'));

            const response = await request(app).get(`/${mockObjectId}/edit`);
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered edit_user');
        });

        test('should return 404 if user not found', async () => {
            // Add auth middleware mock
            app.use(mockAuthMiddleware('admin'));

            const response = await request(app).get('/nonexistentid/edit');
            expect(response.status).toBe(404);
            expect(response.text).toContain('Rendered 404');
        });
    });

    describe('PUT /:id', () => {
        test('should update user and redirect to user management', async () => {
            // Add auth middleware mock
            app.use(mockAuthMiddleware('admin'));

            const updatedUser = {
                name: 'Updated User',
                email: 'updated@example.com',
                role: 'manager'
            };

            const response = await request(app)
                .put(`/${mockObjectId}`)
                .send(updatedUser);

            expect(response.status).toBe(200);
            expect(response.text).toContain('Redirected to /user-management');
        });
    });

    describe('DELETE /:id', () => {
        test('should delete user and redirect to user management', async () => {
            // Add auth middleware mock
            app.use(mockAuthMiddleware('admin'));

            const response = await request(app).delete(`/${mockObjectId}`);
            expect(response.status).toBe(200);
            expect(response.text).toContain('Redirected to /user-management');
        });
    });
}); 