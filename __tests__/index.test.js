const request = require('supertest');
const express = require('express');
const router = require('../routes/index');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');

const app = express();
app.use(express.json());
app.use('/', router);

// Mock middleware
jest.mock('../middleware/auth', () => ({
    ensureAuthenticated: (req, res, next) => next(),
    ensureRoles: (roles) => (req, res, next) => next()
}));

describe('GET /', () => {
    it('should render the home page', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Welcome to Budget Claims System');
    });
});

describe('GET /login', () => {
    it('should render the login page', async () => {
        const res = await request(app).get('/login');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Login');
    });
});

describe('GET /register', () => {
    it('should render the register page', async () => {
        const res = await request(app).get('/register');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Register');
    });
});

describe('GET /dashboard', () => {
    it('should render the dashboard page for admin or manager', async () => {
        const res = await request(app).get('/dashboard');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Dashboard - Budget Claims System');
    });
});

describe('GET /help', () => {
    it('should render the help page', async () => {
        const res = await request(app).get('/help');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Help');
    });
});

describe('GET /user-management', () => {
    it('should render the user management page for admin', async () => {
        const res = await request(app).get('/user-management');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('User Management');
    });
});

describe('GET /reports', () => {
    it('should render the reports page for admin or manager', async () => {
        const res = await request(app).get('/reports');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Reports');
    });
});

describe('GET /logout', () => {
    it('should redirect to home page after logout', async () => {
        const res = await request(app).get('/logout');
        expect(res.statusCode).toEqual(302);
        expect(res.headers.location).toBe('/');
    });
});

describe('GET /audit-logs', () => {
    it('should render the audit logs page for admin', async () => {
        const res = await request(app).get('/audit-logs');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Audit Logs');
    });
});

describe('GET /import', () => {
    it('should render the import data page', async () => {
        const res = await request(app).get('/import');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('Import Data - Budget Claims System');
    });
});