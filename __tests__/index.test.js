const request = require('supertest');
const express = require('express');
const router = require('../routes/index');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const User = require('../models/User');
const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');

// Create Express app for testing
const app = express();

// Mock dependencies
jest.mock('../middleware/auth');
jest.mock('../models/User');
jest.mock('../models/Claim');
jest.mock('../models/AuditLog');

// Setup Express middleware and routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use('/', router);

describe('Index Routes', () => {
    let mockUser;
    let mockClaims;
    let mockAuditLogs;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock user
        mockUser = {
            id: 'testUserId',
            name: 'Test User',
            email: 'test@example.com',
            role: 'admin'
        };

        // Setup mock claims data
        mockClaims = {
            totalClaims: 10,
            openClaims: 3,
            inProgressClaims: 4,
            closedClaims: 3,
            avgResolutionTime: 5.5
        };

        // Setup mock audit logs
        mockAuditLogs = [
            { action: 'login', user: mockUser, timestamp: new Date() },
            { action: 'view_claim', user: mockUser, timestamp: new Date() }
        ];

        // Setup default auth middleware behavior
        ensureAuthenticated.mockImplementation((req, res, next) => {
            req.user = mockUser;
            next();
        });
        ensureRoles.mockImplementation((roles) => (req, res, next) => next());
    });

    describe('GET /', () => {
        it('should render the home page', async () => {
            const res = await request(app)
                .get('/')
                .expect(200);

            expect(res.text).toContain('Welcome to Budget Claims System');
        });
    });

    describe('GET /login', () => {
        it('should render the login page', async () => {
            const res = await request(app)
                .get('/login')
                .expect(200);

            expect(res.text).toContain('Login');
        });

        it('should redirect to dashboard if already authenticated', async () => {
            ensureAuthenticated.mockImplementation((req, res, next) => {
                req.isAuthenticated = () => true;
                next();
            });

            const res = await request(app)
                .get('/login')
                .expect(302);

            expect(res.header.location).toBe('/dashboard');
        });
    });

    describe('GET /register', () => {
        it('should render the register page', async () => {
            const res = await request(app)
                .get('/register')
                .expect(200);

            expect(res.text).toContain('Register');
        });
    });

    describe('GET /dashboard', () => {
        beforeEach(() => {
            Claim.countDocuments.mockResolvedValueOnce(mockClaims.totalClaims)
                .mockResolvedValueOnce(mockClaims.openClaims)
                .mockResolvedValueOnce(mockClaims.inProgressClaims)
                .mockResolvedValueOnce(mockClaims.closedClaims);
            
            Claim.find.mockResolvedValue([
                { createdAt: new Date(), updatedAt: new Date() }
            ]);
        });

        it('should render the dashboard with analytics data', async () => {
            const res = await request(app)
                .get('/dashboard')
                .expect(200);

            expect(res.text).toContain('Dashboard - Budget Claims System');
            expect(Claim.countDocuments).toHaveBeenCalledTimes(4);
            expect(Claim.find).toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            Claim.countDocuments.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .get('/dashboard')
                .expect(500);

            expect(res.body.error).toBeDefined();
        });

        it('should require authentication', async () => {
            ensureAuthenticated.mockImplementation((req, res, next) => {
                res.status(401).json({ error: 'Unauthorized' });
            });

            await request(app)
                .get('/dashboard')
                .expect(401);
        });
    });

    describe('GET /help', () => {
        it('should render the help page', async () => {
            const res = await request(app)
                .get('/help')
                .expect(200);

            expect(res.text).toContain('Help');
        });
    });

    describe('GET /user-management', () => {
        beforeEach(() => {
            User.find.mockResolvedValue([mockUser]);
        });

        it('should render the user management page for admin', async () => {
            const res = await request(app)
                .get('/user-management')
                .expect(200);

            expect(res.text).toContain('User Management');
            expect(User.find).toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            User.find.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .get('/user-management')
                .expect(500);

            expect(res.body.error).toBeDefined();
        });

        it('should require admin role', async () => {
            ensureRoles.mockImplementation((roles) => (req, res, next) => {
                res.status(403).json({ error: 'Forbidden' });
            });

            await request(app)
                .get('/user-management')
                .expect(403);
        });
    });

    describe('GET /reports', () => {
        it('should render the reports page for admin or manager', async () => {
            const res = await request(app)
                .get('/reports')
                .expect(200);

            expect(res.text).toContain('Reports');
        });

        it('should require appropriate role', async () => {
            ensureRoles.mockImplementation((roles) => (req, res, next) => {
                res.status(403).json({ error: 'Forbidden' });
            });

            await request(app)
                .get('/reports')
                .expect(403);
        });
    });

    describe('GET /logout', () => {
        it('should logout and redirect to home page', async () => {
            const mockLogout = jest.fn((cb) => cb());
            const req = { logout: mockLogout };
            
            ensureAuthenticated.mockImplementation((req, res, next) => {
                req.logout = mockLogout;
                next();
            });

            const res = await request(app)
                .get('/logout')
                .expect(302);

            expect(res.header.location).toBe('/');
        });
    });

    describe('GET /audit-logs', () => {
        beforeEach(() => {
            AuditLog.find.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockAuditLogs)
            });
        });

        it('should render the audit logs page for admin', async () => {
            const res = await request(app)
                .get('/audit-logs')
                .expect(200);

            expect(res.text).toContain('Audit Logs');
            expect(AuditLog.find).toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            AuditLog.find.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockRejectedValue(new Error('Database error'))
            });

            const res = await request(app)
                .get('/audit-logs')
                .expect(500);

            expect(res.body.error).toBeDefined();
        });
    });

    describe('GET /import', () => {
        it('should render the import data page', async () => {
            const res = await request(app)
                .get('/import')
                .expect(200);

            expect(res.text).toContain('Import Data - Budget Claims System');
        });
    });
});