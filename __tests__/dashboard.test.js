const request = require('supertest');
const express = require('express');
const dashboardRouter = require('../routes/dashboard');
const Claim = require('../models/Claim');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const pinoLogger = require('../logger');

jest.mock('../models/Claim');
jest.mock('../middleware/auth');
jest.mock('../logger');

const app = express();
app.use(express.json());
app.use('/', dashboardRouter);

describe('GET /dashboard', () => {
    beforeEach(() => {
        ensureAuthenticated.mockImplementation((req, res, next) => next());
        ensureRoles.mockImplementation((roles) => (req, res, next) => next());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render the dashboard with correct data', async () => {
        Claim.countDocuments.mockResolvedValueOnce(100); // totalClaims
        Claim.countDocuments.mockResolvedValueOnce(20); // openClaims
        Claim.countDocuments.mockResolvedValueOnce(30); // inProgressClaims
        Claim.countDocuments.mockResolvedValueOnce(50); // closedClaims
        Claim.countDocuments.mockResolvedValueOnce(10); // heavyHitClaims
        Claim.countDocuments.mockResolvedValueOnce(15); // lightHitClaims
        Claim.countDocuments.mockResolvedValueOnce(5); // mysteryClaims
        Claim.aggregate.mockResolvedValueOnce([{ avgResolutionTime: 86400000 }]); // avgResolutionTime (1 day in ms)
        Claim.find.mockResolvedValueOnce([
            { customerName: 'John Doe', mva: '12345', updatedAt: new Date() }
        ]); // recentActivities

        const response = await request(app).get('/dashboard');

        expect(response.status).toBe(200);
        expect(response.text).toContain('Dashboard - Budget Claims System');
        expect(response.text).toContain('100'); // totalClaims
        expect(response.text).toContain('20'); // openClaims
        expect(response.text).toContain('30'); // inProgressClaims
        expect(response.text).toContain('50'); // closedClaims
        expect(response.text).toContain('10'); // heavyHitClaims
        expect(response.text).toContain('15'); // lightHitClaims
        expect(response.text).toContain('5'); // mysteryClaims
        expect(response.text).toContain('1.00'); // avgResolutionTime in days
        expect(response.text).toContain('Claim 12345 for John Doe was updated on'); // recentActivities
    });

    it('should handle errors when fetching dashboard data', async () => {
        Claim.countDocuments.mockRejectedValueOnce(new Error('Database Error'));

        const response = await request(app).get('/dashboard');

        expect(response.status).toBe(500);
        expect(response.text).toBe('Server Error');
    });
});