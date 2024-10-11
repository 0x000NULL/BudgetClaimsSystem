const request = require('supertest');
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const User = require('../models/User');
const usersRouter = require('../routes/users');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use('/users', usersRouter);

jest.mock('../models/User');
jest.mock('../middleware/auth', () => ({
    ensureAuthenticated: jest.fn((req, res, next) => next()),
    ensureRoles: jest.fn((roles) => (req, res, next) => next())
}));

describe('User Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await new Promise(resolve => setTimeout(() => resolve(), 500)); // wait for 500ms to ensure all connections are closed
    });

    describe('GET /users/register', () => {
        it('should render the register page', async () => {
            const res = await request(app).get('/users/register');
            expect(res.status).toBe(200);
            expect(res.text).toContain('Register');
        });
    });

    describe('POST /users/register', () => {
        it('should register a user', async () => {
            User.findOne.mockResolvedValue(null);
            User.prototype.save.mockResolvedValue({});

            const res = await request(app)
                .post('/users/register')
                .send({ name: 'Test User', email: 'test@example.com', password: 'password', role: 'user' });

            expect(res.status).toBe(302);
            expect(res.header.location).toBe('/login');
        });

        it('should not register a user with an existing email', async () => {
            User.findOne.mockResolvedValue({ email: 'test@example.com' });

            const res = await request(app)
                .post('/users/register')
                .send({ name: 'Test User', email: 'test@example.com', password: 'password', role: 'user' });

            expect(res.status).toBe(200);
            expect(res.text).toContain('Email already exists');
        });
    });

    describe('GET /users/login', () => {
        it('should render the login page', async () => {
            const res = await request(app).get('/users/login');
            expect(res.status).toBe(200);
            expect(res.text).toContain('Login');
        });
    });

    describe('POST /users/login', () => {
        it('should login a user', async () => {
            passport.authenticate = jest.fn((strategy, options, callback) => (req, res, next) => {
                callback(null, { id: 'userId' }, null);
            });

            const res = await request(app)
                .post('/users/login')
                .send({ email: 'test@example.com', password: 'password' });

            expect(res.status).toBe(302);
            expect(res.header.location).toBe('/dashboard');
        });

        it('should not login a user with incorrect credentials', async () => {
            passport.authenticate = jest.fn((strategy, options, callback) => (req, res, next) => {
                callback(null, false, { message: 'Password incorrect' });
            });

            const res = await request(app)
                .post('/users/login')
                .send({ email: 'test@example.com', password: 'wrongpassword' });

            expect(res.status).toBe(302);
            expect(res.header.location).toBe('/login');
        });
    });

    describe('GET /users/logout', () => {
        it('should logout a user', async () => {
            const res = await request(app).get('/users/logout');
            expect(res.status).toBe(302);
            expect(res.header.location).toBe('/login');
        });
    });

    describe('GET /users/user-management', () => {
        it('should render the user management page for admin', async () => {
            ensureAuthenticated.mockImplementation((req, res, next) => next());
            ensureRoles.mockImplementation((roles) => (req, res, next) => next());
            User.find.mockResolvedValue([{ name: 'Test User', email: 'test@example.com', role: 'user' }]);

            const res = await request(app).get('/users/user-management');
            expect(res.status).toBe(200);
            expect(res.text).toContain('User Management');
        });
    });

    describe('GET /users/:id/edit', () => {
        it('should render the edit user page for admin', async () => {
            ensureAuthenticated.mockImplementation((req, res, next) => next());
            ensureRoles.mockImplementation((roles) => (req, res, next) => next());
            User.findById.mockResolvedValue({ name: 'Test User', email: 'test@example.com', role: 'user' });

            const res = await request(app).get('/users/1/edit');
            expect(res.status).toBe(200);
            expect(res.text).toContain('Edit User');
        });
    });

    describe('PUT /users/:id', () => {
        it('should update a user', async () => {
            ensureAuthenticated.mockImplementation((req, res, next) => next());
            ensureRoles.mockImplementation((roles) => (req, res, next) => next());
            User.findById.mockResolvedValue({ save: jest.fn().mockResolvedValue({}) });

            const res = await request(app)
                .put('/users/1')
                .send({ name: 'Updated User', email: 'updated@example.com', role: 'user' });

            expect(res.status).toBe(302);
            expect(res.header.location).toBe('/users/user-management');
        });
    });

    describe('DELETE /users/:id', () => {
        it('should delete a user', async () => {
            ensureAuthenticated.mockImplementation((req, res, next) => next());
            ensureRoles.mockImplementation((roles) => (req, res, next) => next());
            User.findByIdAndDelete.mockResolvedValue({});

            const res = await request(app).delete('/users/1');
            expect(res.status).toBe(302);
            expect(res.header.location).toBe('/users/user-management');
        });
    });
});