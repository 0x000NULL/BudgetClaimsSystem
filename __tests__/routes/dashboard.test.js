/**
 * @fileoverview Test suite for the dashboard routes and helper functions.
 * Uses Jest as the test framework and supertest for HTTP assertions.
 */

const request = require('supertest');
const express = require('express');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const path = require('path');

// Mock dependencies
jest.mock('../../models/Claim');
jest.mock('../../models/Status');
jest.mock('../../middleware/auth', () => ({
    ensureAuthenticated: (req, res, next) => next()
}));
jest.mock('../../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
}));

// Import mocked modules
const Claim = require('../../models/Claim');
const Status = require('../../models/Status');
const pinoLogger = require('../../logger');

// Import the module to test
const dashboardRouter = require('../../routes/dashboard');

// Create an Express app for testing
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', dashboardRouter);

// Mock a render function since we're not actually rendering EJS templates
app.use((req, res, next) => {
    res.render = jest.fn((view, locals) => {
        res.status(200).json({ view, locals });
    });
    next();
});

describe('Dashboard Routes and Helper Functions', () => {
    let mongoServer;
    
    // Setup and teardown for the tests
    beforeAll(async () => {
        // Create an in-memory MongoDB instance
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        // Check if mongoose is already connected
        if (mongoose.connection.readyState === 0) { // 0 = disconnected
            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
        } else {
            // If already connected, disconnect first to avoid errors
            await mongoose.disconnect();
            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
        }
    });

    afterAll(async () => {
        // Ensure proper cleanup
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('filterSensitiveData function', () => {
        // Export the function for testing
        const { filterSensitiveData } = require('../../routes/dashboard');

        test('should mask sensitive fields', () => {
            const data = {
                username: 'testuser',
                password: 'testpass',
                ssn: '123-45-6789',
                creditCard: '4111-1111-1111-1111',
                securityAnswer: 'mothers maiden name'
            };
            
            const filtered = filterSensitiveData(data);
            
            expect(filtered.username).toBe('testuser');
            expect(filtered.password).toBe('***REDACTED***');
            expect(filtered.ssn).toBe('***REDACTED***');
            expect(filtered.creditCard).toBe('***REDACTED***');
            expect(filtered.securityAnswer).toBe('***REDACTED***');
        });

        test('should handle case-insensitive sensitive fields', () => {
            const data = {
                Username: 'testuser',
                PASSWORD: 'testpass',
                Ssn: '123-45-6789'
            };
            
            const filtered = filterSensitiveData(data);
            
            expect(filtered.Username).toBe('testuser');
            expect(filtered.PASSWORD).toBe('***REDACTED***');
            expect(filtered.Ssn).toBe('***REDACTED***');
        });

        test('should recursively filter nested objects', () => {
            const data = {
                user: {
                    name: 'Test User',
                    password: 'secret',
                    details: {
                        ssn: '123-45-6789'
                    }
                }
            };
            
            const filtered = filterSensitiveData(data);
            
            expect(filtered.user.name).toBe('Test User');
            expect(filtered.user.password).toBe('***REDACTED***');
            expect(filtered.user.details.ssn).toBe('***REDACTED***');
        });

        test('should handle null and undefined values', () => {
            const data = {
                username: 'testuser',
                password: null,
                profile: undefined,
                details: null
            };
            
            const filtered = filterSensitiveData(data);
            
            expect(filtered.username).toBe('testuser');
            expect(filtered.password).toBe(null);
            expect(filtered.profile).toBeUndefined();
            expect(filtered.details).toBe(null);
        });

        test('should handle non-object inputs', () => {
            expect(filterSensitiveData('string')).toBe('string');
            expect(filterSensitiveData(123)).toBe(123);
            expect(filterSensitiveData(null)).toBe(null);
            expect(filterSensitiveData(undefined)).toBeUndefined();
        });
    });

    describe('logRequest function', () => {
        // Export the function for testing
        const { logRequest } = require('../../routes/dashboard');

        test('should log request with user info if authenticated', () => {
            const req = {
                user: { email: 'test@example.com' },
                ip: '127.0.0.1',
                sessionID: 'test-session',
                method: 'GET',
                originalUrl: '/dashboard',
                headers: { 'user-agent': 'Jest Test' },
                body: { query: 'test', password: 'secret' }
            };
            
            logRequest(req, 'Test message', { extra: 'data' });
            
            expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Test message',
                user: 'test@example.com',
                ip: '127.0.0.1',
                sessionId: 'test-session',
                method: 'GET',
                url: '/dashboard',
                extra: 'data'
            }));
            
            // Verify that sensitive data is filtered
            const logCall = pinoLogger.info.mock.calls[0][0];
            expect(logCall.requestBody.query).toBe('test');
            expect(logCall.requestBody.password).toBe('***REDACTED***');
        });

        test('should handle unauthenticated requests', () => {
            const req = {
                ip: '127.0.0.1',
                sessionID: 'test-session',
                method: 'GET',
                originalUrl: '/dashboard',
                headers: { 'user-agent': 'Jest Test' },
                body: { query: 'test' }
            };
            
            logRequest(req, 'Unauthenticated request');
            
            expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Unauthenticated request',
                user: 'Unauthenticated',
                ip: '127.0.0.1'
            }));
        });

        test('should handle missing request body or headers', () => {
            const req = {
                user: { email: 'test@example.com' },
                ip: '127.0.0.1',
                sessionID: 'test-session',
                method: 'GET',
                originalUrl: '/dashboard'
                // No body or headers
            };
            
            logRequest(req, 'Missing body or headers');
            
            expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Missing body or headers',
                user: 'test@example.com'
            }));
            
            // Should not throw errors due to undefined body/headers
            expect(() => logRequest(req, 'test')).not.toThrow();
        });
    });

    describe('getContrastColor function', () => {
        // Export the function for testing
        const { getContrastColor } = require('../../routes/dashboard');

        test('should return black for light colors', () => {
            expect(getContrastColor('#FFFFFF')).toBe('#000000'); // White
            expect(getContrastColor('#FFFF00')).toBe('#000000'); // Yellow
            expect(getContrastColor('#90EE90')).toBe('#000000'); // Light green
        });

        test('should return white for dark colors', () => {
            expect(getContrastColor('#000000')).toBe('#ffffff'); // Black
            expect(getContrastColor('#800080')).toBe('#ffffff'); // Purple
            expect(getContrastColor('#0000FF')).toBe('#ffffff'); // Blue
        });

        test('should handle hex colors with or without #', () => {
            expect(getContrastColor('FFFFFF')).toBe('#000000');
            expect(getContrastColor('#FFFFFF')).toBe('#000000');
        });

        test('should return default color for invalid inputs', () => {
            expect(getContrastColor(null)).toBe('#ffffff');
            expect(getContrastColor(undefined)).toBe('#ffffff');
            expect(getContrastColor('')).toBe('#ffffff');
            expect(getContrastColor('not-a-color')).toBe('#ffffff');
            expect(getContrastColor('#XYZ')).toBe('#ffffff');
        });
    });

    describe('lightenColor function', () => {
        // Export the function for testing
        const { lightenColor } = require('../../routes/dashboard');

        test('should lighten a color by the specified percentage', () => {
            expect(lightenColor('#000000', 100)).toBe('#ffffff'); // Black to white with 100%
            expect(lightenColor('#000000', 50)).toBe('#7f7f7f'); // Black to gray with 50%
            
            // Red with 20% lightening (should add 51 to each RGB component)
            const lightened = lightenColor('#FF0000', 20);
            expect(lightened.toUpperCase()).toBe('#FF3333');
        });

        test('should handle color bounds correctly', () => {
            // White can't get lighter, should remain white
            expect(lightenColor('#FFFFFF', 20)).toBe('#ffffff');
            
            // Very dark color with large percentage
            expect(lightenColor('#010101', 100)).toBe('#ffffff');
        });

        test('should return default or original for invalid inputs', () => {
            expect(lightenColor(null, 50)).toBe('#ffffff');
            expect(lightenColor(undefined, 50)).toBe('#ffffff');
            expect(lightenColor('not-a-color', 50)).toBe('#ffffff');
            
            // Should handle errors gracefully
            pinoLogger.warn.mockClear();
            const result = lightenColor('#XYZ', 50);
            expect(result).toBe('#XYZ');
            expect(pinoLogger.warn).toHaveBeenCalled();
        });
    });

    describe('GET /dashboard route', () => {
        beforeEach(() => {
            // Mock the Status.find() method
            Status.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([
                        { _id: 'status1', name: 'Open', color: '#28a745', description: 'Open status' },
                        { _id: 'status2', name: 'In Progress', color: '#ffc107', description: 'In progress status' },
                        { _id: 'status3', name: 'Closed', color: '#dc3545', description: 'Closed status' }
                    ])
                })
            });
            
            // Mock the Claim.countDocuments() and Claim.find() methods
            Claim.countDocuments.mockImplementation((filter) => {
                if (!filter) return Promise.resolve(10); // Total claims
                if (filter.status === 'status1') return Promise.resolve(3); // Open claims
                if (filter.status === 'status2') return Promise.resolve(5); // In progress claims
                if (filter.status === 'status3') return Promise.resolve(2); // Closed claims
                return Promise.resolve(0);
            });
            
            Claim.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([
                    {
                        _id: 'claim1',
                        claimNumber: 'CLM-001',
                        customerName: 'John Doe',
                        updatedAt: new Date(),
                        status: { _id: 'status1', name: 'Open', color: '#28a745', description: 'Open status' }
                    },
                    {
                        _id: 'claim2',
                        claimNumber: 'CLM-002',
                        customerName: 'Jane Smith',
                        updatedAt: new Date(),
                        status: { _id: 'status2', name: 'In Progress', color: '#ffc107', description: 'In progress status' }
                    }
                ])
            });
        });

        test('should render dashboard with claim statistics and recent claims', async () => {
            const response = await request(app).get('/dashboard');
            
            expect(response.status).toBe(200);
            expect(response.body.view).toBe('dashboard');
            
            const locals = response.body.locals;
            expect(locals.title).toBe('Dashboard');
            expect(locals.totalClaims).toBe(10);
            expect(locals.openClaims).toBe(3);
            expect(locals.inProgressClaims).toBe(5);
            expect(locals.closedClaims).toBe(2);
            expect(locals.recentClaims).toHaveLength(2);
            expect(locals.openPercentage).toBe(30);
            expect(locals.inProgressPercentage).toBe(50);
            expect(locals.closedPercentage).toBe(20);
            
            // Verify logger calls
            expect(pinoLogger.debug).toHaveBeenCalled();
        });

        test('should handle case when no statuses are found', async () => {
            Status.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([])
                })
            });
            
            const response = await request(app).get('/dashboard');
            
            expect(response.status).toBe(500);
            expect(response.body.locals.message).toBe('Error loading dashboard');
            expect(pinoLogger.error).toHaveBeenCalled();
        });

        test('should handle case when statuses are found but no claims exist', async () => {
            Claim.countDocuments.mockResolvedValue(0);
            Claim.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([])
            });
            
            const response = await request(app).get('/dashboard');
            
            expect(response.status).toBe(200);
            expect(response.body.locals.totalClaims).toBe(0);
            expect(response.body.locals.recentClaims).toHaveLength(0);
            expect(response.body.locals.openPercentage).toBe(0);
            expect(response.body.locals.inProgressPercentage).toBe(0);
            expect(response.body.locals.closedPercentage).toBe(0);
        });

        test('should handle database errors', async () => {
            Status.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockRejectedValue(new Error('Database error'))
                })
            });
            
            const response = await request(app).get('/dashboard');
            
            expect(response.status).toBe(500);
            expect(pinoLogger.error).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Dashboard error',
                error: 'Database error'
            }));
        });

        test('should handle claims with missing status', async () => {
            Claim.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([
                    {
                        _id: 'claim1',
                        claimNumber: 'CLM-001',
                        customerName: 'John Doe',
                        updatedAt: new Date(),
                        status: null
                    },
                    {
                        _id: 'claim2',
                        claimNumber: null,
                        customerName: null,
                        updatedAt: new Date(),
                        status: undefined
                    }
                ])
            });
            
            const response = await request(app).get('/dashboard');
            
            expect(response.status).toBe(200);
            const recentClaims = response.body.locals.recentClaims;
            
            // First claim should have default status values
            expect(recentClaims[0].status.name).toBe('Pending');
            expect(recentClaims[0].status.color).toBe('#6c757d');
            
            // Second claim should have default name values
            expect(recentClaims[1].claimNumber).toBe('N/A');
            expect(recentClaims[1].customerName).toBe('No Name Provided');
        });
    });
}); 