const request = require('supertest');
const express = require('express');
const dashboardRouter = require('../routes/dashboard');
const Claim = require('../models/Claim');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const pinoLogger = require('../logger');

// Create Express app for testing
const app = express();

// Mock dependencies
jest.mock('../models/Claim');
jest.mock('../middleware/auth');
jest.mock('../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

// Setup Express middleware and routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use('/', dashboardRouter);

describe('Dashboard Routes', () => {
    let mockUser;
    let mockClaims;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock user
        mockUser = {
            id: 'testUserId',
            email: 'test@example.com',
            role: 'admin'
        };

        // Setup mock claims data
        mockClaims = {
            totalClaims: 100,
            openClaims: 20,
            inProgressClaims: 30,
            closedClaims: 50,
            heavyHitClaims: 10,
            lightHitClaims: 15,
            mysteryClaims: 5
        };

        // Setup mock recent activities
        const mockRecentActivities = Array(10).fill(null).map((_, index) => ({
            customerName: `Customer ${index}`,
            mva: `MVA${index}`,
            updatedAt: new Date(),
            toJSON: () => ({
                customerName: `Customer ${index}`,
                mva: `MVA${index}`,
                updatedAt: new Date()
            })
        }));

        // Setup default auth middleware behavior
        ensureAuthenticated.mockImplementation((req, res, next) => {
            req.user = mockUser;
            next();
        });
        ensureRoles.mockImplementation((roles) => (req, res, next) => next());

        // Setup mock Claim methods
        Claim.countDocuments.mockImplementation((query) => {
            if (!query) return Promise.resolve(mockClaims.totalClaims);
            if (query.status === 'Open') return Promise.resolve(mockClaims.openClaims);
            if (query.status === 'In Progress') return Promise.resolve(mockClaims.inProgressClaims);
            if (query.status === 'Closed') return Promise.resolve(mockClaims.closedClaims);
            if (query.damageType === 'Heavy hit') return Promise.resolve(mockClaims.heavyHitClaims);
            if (query.damageType === 'Light hit') return Promise.resolve(mockClaims.lightHitClaims);
            if (query.damageType === 'Mystery') return Promise.resolve(mockClaims.mysteryClaims);
            return Promise.resolve(0);
        });

        Claim.aggregate.mockResolvedValue([{ avgResolutionTime: 86400000 }]); // 1 day in milliseconds

        Claim.find.mockReturnValue({
            sort: () => ({
                limit: () => ({
                    select: () => ({
                        lean: () => Promise.resolve(mockRecentActivities)
                    })
                })
            })
        });
    });

    describe('GET /dashboard', () => {
        it('should render dashboard with complete statistics for authorized users', async () => {
            const res = await request(app)
                .get('/dashboard')
                .expect(200);

            expect(res.text).toContain('Dashboard - Budget Claims System');
            expect(Claim.countDocuments).toHaveBeenCalledTimes(7);
            expect(Claim.aggregate).toHaveBeenCalled();
            expect(Claim.find).toHaveBeenCalled();
            expect(pinoLogger.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Accessing dashboard'
                })
            );
        });

        it('should handle unauthorized access', async () => {
            ensureRoles.mockImplementation(() => (req, res, next) => {
                res.status(403).json({ error: 'Unauthorized' });
            });

            await request(app)
                .get('/dashboard')
                .expect(403);
        });

        it('should handle database errors in claim counts', async () => {
            Claim.countDocuments.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .get('/dashboard')
                .expect(500);

            expect(res.text).toBe('Server Error');
            expect(pinoLogger.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Error fetching dashboard data',
                    error: expect.any(Error)
                })
            );
        });

        it('should handle database errors in average resolution time', async () => {
            Claim.aggregate.mockRejectedValue(new Error('Aggregation error'));

            const res = await request(app)
                .get('/dashboard')
                .expect(500);

            expect(res.text).toBe('Server Error');
        });

        it('should handle database errors in recent activities', async () => {
            Claim.find.mockReturnValue({
                sort: () => ({
                    limit: () => ({
                        select: () => ({
                            lean: () => Promise.reject(new Error('Recent activities error'))
                        })
                    })
                })
            });

            const res = await request(app)
                .get('/dashboard')
                .expect(500);

            expect(res.text).toBe('Server Error');
        });

        it('should handle missing average resolution time data', async () => {
            Claim.aggregate.mockResolvedValue([]);

            const res = await request(app)
                .get('/dashboard')
                .expect(200);

            expect(res.text).toContain('N/A');
        });

        it('should format dates correctly in recent activities', async () => {
            const testDate = new Date('2024-01-01');
            const mockActivity = [{
                customerName: 'Test Customer',
                mva: 'TEST123',
                updatedAt: testDate,
                toJSON: () => ({
                    customerName: 'Test Customer',
                    mva: 'TEST123',
                    updatedAt: testDate
                })
            }];

            Claim.find.mockReturnValue({
                sort: () => ({
                    limit: () => ({
                        select: () => ({
                            lean: () => Promise.resolve(mockActivity)
                        })
                    })
                })
            });

            const res = await request(app)
                .get('/dashboard')
                .expect(200);

            expect(res.text).toContain('1/1/2024');
        });
    });
});