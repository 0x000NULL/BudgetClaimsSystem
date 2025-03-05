const jwt = require('jsonwebtoken');
const { ensureAuthenticated, ensureRole, ensureRoles, isCustomerAuthenticated } = require('../../middleware/auth');

// Mock dependencies
jest.mock('../../logger');
jest.mock('../../models/User', () => ({
    findById: jest.fn().mockReturnThis(),
    select: jest.fn()
}));
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
    let req;
    let res;
    let next;
    const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
    };

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Setup request mock
        req = {
            user: null,
            isAuthenticated: jest.fn(),
            headers: {},
            path: '',
            ip: '127.0.0.1',
            sessionID: 'test-session-id',
            flash: jest.fn()
        };

        // Setup response mock
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
            redirect: jest.fn()
        };

        // Setup next function mock
        next = jest.fn();

        // Setup process.env
        process.env.NODE_ENV = 'development';
        process.env.JWT_SECRET = 'test-secret';

        // Setup default mock implementations
        const User = require('../../models/User');
        User.findById.mockReturnThis();
        User.select.mockResolvedValue(mockUser);
        jwt.verify.mockReturnValue({ id: mockUser.id });
    });

    describe('ensureAuthenticated', () => {
        it('should proceed if user is authenticated via session', async () => {
            req.user = { email: 'test@example.com' };
            req.isAuthenticated.mockReturnValue(true);

            await ensureAuthenticated(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should proceed if valid JWT token is provided', async () => {
            req.headers.authorization = 'Bearer valid-jwt-token';

            await ensureAuthenticated(req, res, next);

            expect(req.user).toEqual(mockUser);
            expect(next).toHaveBeenCalled();
            expect(jwt.verify).toHaveBeenCalled();
        });

        it('should redirect to login for web routes if not authenticated', async () => {
            req.path = '/dashboard';
            
            await ensureAuthenticated(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith('/login');
        });

        it('should return 401 for API routes if not authenticated', async () => {
            req.path = '/api/data';
            
            await ensureAuthenticated(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
        });

        it('should handle test environment with valid-token', async () => {
            process.env.NODE_ENV = 'test';
            req.headers.authorization = 'Bearer valid-token';

            await ensureAuthenticated(req, res, next);

            expect(req.user).toBeDefined();
            expect(next).toHaveBeenCalled();
        });
    });

    describe('ensureRole', () => {
        const roleMiddleware = ensureRole('admin');

        it('should proceed if user has required role via session', async () => {
            req.user = { email: 'test@example.com', role: 'admin' };
            req.isAuthenticated.mockReturnValue(true);

            await roleMiddleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should proceed if user has required role via JWT', async () => {
            req.headers.authorization = 'Bearer valid-jwt-token';

            await roleMiddleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(jwt.verify).toHaveBeenCalled();
        });

        it('should return 403 for API routes if role is incorrect', async () => {
            req.user = { email: 'test@example.com', role: 'user' };
            req.path = '/api/admin';
            req.isAuthenticated.mockReturnValue(true);

            await roleMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
        });

        it('should handle test environment with valid-token', async () => {
            process.env.NODE_ENV = 'test';
            req.headers.authorization = 'Bearer valid-token';

            await roleMiddleware(req, res, next);

            expect(req.user).toBeDefined();
            expect(req.user.role).toBe('admin');
            expect(next).toHaveBeenCalled();
        });
    });

    describe('ensureRoles', () => {
        const rolesMiddleware = ensureRoles(['admin', 'manager']);

        it('should proceed if user has one of required roles via session', async () => {
            req.user = { email: 'test@example.com', role: 'manager' };
            req.isAuthenticated.mockReturnValue(true);

            await rolesMiddleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should proceed if user has one of required roles via JWT', async () => {
            req.headers.authorization = 'Bearer valid-jwt-token';

            await rolesMiddleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(jwt.verify).toHaveBeenCalled();
        });

        it('should return 403 if user role is not in allowed roles', async () => {
            req.user = { email: 'test@example.com', role: 'user' };
            req.path = '/api/admin';
            req.isAuthenticated.mockReturnValue(true);

            await rolesMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
        });

        it('should handle test environment with valid-token', async () => {
            process.env.NODE_ENV = 'test';
            req.headers.authorization = 'Bearer valid-token';

            await rolesMiddleware(req, res, next);

            expect(req.user).toBeDefined();
            expect(req.user.role).toBe('admin');
            expect(next).toHaveBeenCalled();
        });
    });

    describe('isCustomerAuthenticated', () => {
        it('should proceed if customer is authenticated via session', async () => {
            req.user = { email: 'customer@example.com', role: 'customer' };
            req.isAuthenticated.mockReturnValue(true);

            await isCustomerAuthenticated(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should proceed if customer is authenticated via JWT', async () => {
            const customerUser = { ...mockUser, role: 'customer' };
            const User = require('../../models/User');
            User.select.mockResolvedValueOnce(customerUser);
            req.headers.authorization = 'Bearer valid-jwt-token';

            await isCustomerAuthenticated(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(jwt.verify).toHaveBeenCalled();
        });

        it('should redirect to customer login if not authenticated', async () => {
            await isCustomerAuthenticated(req, res, next);

            expect(req.flash).toHaveBeenCalledWith('error', 'Please log in to access this page');
            expect(res.redirect).toHaveBeenCalledWith('/customer/login');
        });

        it('should handle test environment with valid-token', async () => {
            process.env.NODE_ENV = 'test';
            req.headers.authorization = 'Bearer valid-token';

            await isCustomerAuthenticated(req, res, next);

            expect(req.user).toBeDefined();
            expect(req.user.role).toBe('customer');
            expect(next).toHaveBeenCalled();
        });
    });
}); 