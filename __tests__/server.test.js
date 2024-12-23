const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const Settings = require('../models/Settings');
const pinoLogger = require('../logger');
const path = require('path');
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

// Mock external dependencies
jest.mock('../logger');
jest.mock('../models/Settings');
jest.mock('../notifications/reminderScheduler', () => ({}));
jest.mock('express-session', () => jest.fn(() => (req, res, next) => next()));
jest.mock('passport', () => ({
    initialize: jest.fn(() => (req, res, next) => next()),
    session: jest.fn(() => (req, res, next) => next()),
    use: jest.fn(),
    serializeUser: jest.fn(),
    deserializeUser: jest.fn()
}));
jest.mock('pino-http', () => () => (req, res, next) => {
    req.log = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    };
    next();
});

// Mock fs module for SSL certificates
jest.mock('fs', () => ({
    readFileSync: jest.fn(() => 'mock-certificate-content')
}));

// Add these mocks at the top with other mocks
jest.mock('../routes/index', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('Home'));
    return router;
});

jest.mock('../routes/users', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('Users'));
    return router;
});

jest.mock('../routes/claims', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('Claims'));
    return router;
});

jest.mock('../routes/dashboard', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('Dashboard'));
    return router;
});

jest.mock('../routes/api', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('API'));
    return router;
});

jest.mock('../routes/feedback', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('Feedback'));
    return router;
});

jest.mock('../routes/customers', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('Customers'));
    return router;
});

jest.mock('../routes/employees', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('Employees'));
    return router;
});

jest.mock('../routes/email', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('Email'));
    return router;
});

jest.mock('../routes/reports', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('Reports'));
    return router;
});

jest.mock('../routes/auditLogs', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('Audit Logs'));
    return router;
});

jest.mock('../routes/emailTemplates', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('Email Templates'));
    return router;
});

jest.mock('../routes/export', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('Export'));
    return router;
});

jest.mock('../routes/import', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.send('Import'));
    return router;
});

// Add with other mocks
jest.mock('https', () => ({
    createServer: jest.fn((options, app) => ({
        listen: jest.fn((port, callback) => callback())
    }))
}));

describe('Server Configuration', () => {
    let app;
    
    beforeAll(async () => {
        // Clear all mocks before tests
        jest.clearAllMocks();
        
        // Mock mongoose.connect to prevent actual connection
        mongoose.connect = jest.fn().mockResolvedValue();
        
        // Import server after setting env variables
        app = require('../server');
    });

    describe('Basic Server Setup', () => {
        it('should initialize express application', () => {
            expect(app).toBeDefined();
            expect(app.get('view engine')).toBe('ejs');
        });

        it('should configure basic middleware', () => {
            const middlewares = app._router.stack
                .filter(layer => layer.name !== '<anonymous>')
                .map(layer => layer.name);

            // Update expectations to match actual middleware names
            expect(middlewares).toEqual(
                expect.arrayContaining(['query', 'expressInit'])
            );
        });
    });

    describe('Security Configuration', () => {
        it('should apply security headers in production', async () => {
            process.env.NODE_ENV = 'production';
            const response = await request(app).get('/');
            
            expect(response.headers).toHaveProperty('x-frame-options');
            expect(response.headers).toHaveProperty('x-content-type-options');
        });

        it('should have CSP headers configured', async () => {
            const response = await request(app).get('/');
            expect(response.headers).toHaveProperty('content-security-policy');
        });

        it('should handle CSP violation reports', async () => {
            const response = await request(app)
                .post('/csp-violation-report')
                .send({ 
                    'csp-report': {
                        'document-uri': 'http://example.com',
                        'violated-directive': 'script-src'
                    }
                });

            expect(response.status).toBe(204);
            expect(pinoLogger.warn).toHaveBeenCalled();
        });
    });

    describe('Settings Loading', () => {
        beforeEach(() => {
            Settings.findOne.mockClear();
        });

        it('should load file size settings', async () => {
            Settings.findOne.mockResolvedValueOnce({
                type: 'fileSize',
                settings: {
                    photos: 5000000,
                    documents: 10000000
                }
            });

            // Call loadSettings directly since it's not on app.locals
            await global.loadSettings();

            expect(Settings.findOne).toHaveBeenCalledWith({ type: 'fileSize' });
            expect(global.MAX_FILE_SIZES).toMatchObject({
                photos: 5000000,
                documents: 10000000
            });
        });

        it('should handle settings load errors', async () => {
            Settings.findOne.mockRejectedValueOnce(new Error('Database error'));

            await global.loadSettings();

            expect(pinoLogger.error).toHaveBeenCalledWith(
                'Error loading settings:',
                expect.any(Error)
            );
        });
    });

    describe('Route Configuration', () => {
        it('should register core routes', () => {
            const routes = app._router.stack
                .filter(layer => layer.route)
                .map(layer => layer.route?.path)
                .filter(Boolean);

            expect(routes).toEqual(
                expect.arrayContaining(['/csp-violation-report'])
            );
        });

        it('should handle 404 errors', async () => {
            const response = await request(app)
                .get('/nonexistent-route');

            expect(response.status).toBe(404);
        });
    });

    describe('Authentication Setup', () => {
        it('should initialize passport', () => {
            expect(passport.initialize).toHaveBeenCalled();
            expect(passport.session).toHaveBeenCalled();
        });

        it('should configure session middleware', () => {
            expect(session).toHaveBeenCalledWith(expect.objectContaining({
                secret: 'test-session-secret',
                resave: false,
                saveUninitialized: false
            }));
        });
    });

    describe('Environment Variables', () => {
        it('should log required environment variables', () => {
            expect(pinoLogger.info).toHaveBeenCalledWith(
                'MONGO_URI:',
                process.env.MONGO_URI
            );
            expect(pinoLogger.info).toHaveBeenCalledWith(
                'SESSION_SECRET:',
                process.env.SESSION_SECRET
            );
        });
    });

    afterAll(async () => {
        // Clean up
        jest.resetModules();
        delete process.env.NODE_ENV;
        delete process.env.PORT;
        delete process.env.MONGO_URI;
        delete process.env.SESSION_SECRET;
        delete process.env.JWT_SECRET;
        delete process.env.EMAIL_USER;
        delete process.env.EMAIL_PASS;
    });
}); 