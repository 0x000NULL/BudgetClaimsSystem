const request = require('supertest');
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const usersRouter = require('../routes/users');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const MongoStore = require('connect-mongo');

// Create Express app for testing
const app = express();

// Mock User model methods
jest.mock('../models/User');

// Mock authentication middleware
jest.mock('../middleware/auth', () => ({
    ensureAuthenticated: jest.fn((req, res, next) => next()),
    ensureRoles: jest.fn((roles) => (req, res, next) => next())
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashedPassword'),
    compare: jest.fn().mockResolvedValue(true)
}));

describe('User Routes', () => {
    let mockUser;

    beforeAll(() => {
        // Setup Express middleware
        app.use(express.urlencoded({ extended: false }));
        app.use(express.json());
        app.use(session({ 
            secret: 'test-secret', 
            resave: false, 
            saveUninitialized: false,
            store: MongoStore.create({ mongoUrl: process.env.MONGO_URI_TEST || process.env.MONGO_URI })
        }));
        app.use(passport.initialize());
        app.use(passport.session());
        app.use(flash());
        app.use((req, res, next) => {
            res.locals.success_msg = req.flash('success_msg');
            res.locals.error_msg = req.flash('error_msg');
            res.locals.error = req.flash('error');
            next();
        });
        app.use('/users', usersRouter);

        // Setup view engine
        app.set('view engine', 'ejs');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockUser = {
            id: 'testUserId',
            name: 'Test User',
            email: 'test@example.com',
            password: 'hashedPassword',
            role: 'user',
            save: jest.fn().mockResolvedValue(true)
        };
    });

    describe('GET /users/register', () => {
        it('should render the register page', async () => {
            const res = await request(app)
                .get('/users/register')
                .expect(200);
            
            expect(res.text).toContain('Register');
        });
    });

    describe('POST /users/register', () => {
        it('should register a new user successfully', async () => {
            User.findOne.mockResolvedValue(null);
            User.prototype.save.mockResolvedValue(mockUser);

            const res = await request(app)
                .post('/users/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                    password2: 'password123',
                    role: 'user'
                })
                .expect(302);

            expect(res.header.location).toBe('/login');
            expect(User.prototype.save).toHaveBeenCalled();
        });

        it('should not register user with existing email', async () => {
            User.findOne.mockResolvedValue(mockUser);

            const res = await request(app)
                .post('/users/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                    password2: 'password123',
                    role: 'user'
                })
                .expect(200);

            expect(res.text).toContain('Email already exists');
            expect(User.prototype.save).not.toHaveBeenCalled();
        });

        it('should validate password match', async () => {
            const res = await request(app)
                .post('/users/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                    password2: 'different',
                    role: 'user'
                })
                .expect(200);

            expect(res.text).toContain('Passwords do not match');
        });
    });

    describe('POST /users/login', () => {
        beforeEach(() => {
            passport.authenticate = jest.fn((strategy, options, callback) => 
                (req, res, next) => callback(null, mockUser));
        });

        it('should login successfully with valid credentials', async () => {
            const res = await request(app)
                .post('/users/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(302);

            expect(res.header.location).toBe('/dashboard');
        });

        it('should handle invalid credentials', async () => {
            passport.authenticate = jest.fn((strategy, options, callback) => 
                (req, res, next) => callback(null, false, { message: 'Invalid credentials' }));

            const res = await request(app)
                .post('/users/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword'
                })
                .expect(302);

            expect(res.header.location).toBe('/login');
        });
    });

    describe('GET /users/logout', () => {
        it('should logout user and redirect to login', async () => {
            const res = await request(app)
                .get('/users/logout')
                .expect(302);

            expect(res.header.location).toBe('/login');
        });
    });

    describe('User Management (Admin)', () => {
        beforeEach(() => {
            ensureAuthenticated.mockImplementation((req, res, next) => {
                req.user = { ...mockUser, role: 'admin' };
                next();
            });
        });

        it('should get user management page', async () => {
            User.find.mockResolvedValue([mockUser]);

            const res = await request(app)
                .get('/users/user-management')
                .expect(200);

            expect(res.text).toContain('User Management');
        });

        it('should update user details', async () => {
            User.findById.mockResolvedValue(mockUser);

            const res = await request(app)
                .put('/users/1')
                .send({
                    name: 'Updated Name',
                    email: 'updated@example.com',
                    role: 'user'
                })
                .expect(302);

            expect(res.header.location).toBe('/users/user-management');
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should delete user', async () => {
            User.findByIdAndDelete.mockResolvedValue(mockUser);

            const res = await request(app)
                .delete('/users/1')
                .expect(302);

            expect(res.header.location).toBe('/users/user-management');
            expect(User.findByIdAndDelete).toHaveBeenCalledWith('1');
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors during registration', async () => {
            User.findOne.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .post('/users/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                    password2: 'password123',
                    role: 'user'
                })
                .expect(500);

            expect(res.text).toContain('Server error');
        });

        it('should handle database errors in user management', async () => {
            User.find.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .get('/users/user-management')
                .expect(500);

            expect(res.text).toContain('Internal Server Error');
        });
    });
});