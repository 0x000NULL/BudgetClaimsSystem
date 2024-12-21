const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const flash = require('connect-flash');
const exportRoutes = require('../routes/export');
const auditLogRoutes = require('../routes/auditLogs');
const auth = require('../middleware/auth');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user;
    next();
});
app.use('/export', exportRoutes);
app.use('/audit-logs', auditLogRoutes);

// Define additional routes for testing
app.get('/', (req, res) => res.status(200).send('Home Page'));
app.get('/users', (req, res) => res.status(200).send('Users Page'));
app.get('/claims', (req, res) => res.status(200).send('Claims Page'));
app.get('/dashboard', (req, res) => res.status(200).send('Dashboard Page'));
app.get('/api', (req, res) => res.status(200).send('API Page'));
app.get('/feedback', (req, res) => res.status(200).send('Feedback Page'));
app.get('/customers', (req, res) => res.status(200).send('Customers Page'));
app.get('/employee', (req, res) => res.status(200).send('Employee Page'));
app.get('/email', (req, res) => res.status(200).send('Email Page'));
app.get('/reports', (req, res) => res.status(200).send('Reports Page'));
app.get('/email-templates', (req, res) => res.status(200).send('Email Templates Page'));
app.get('/import', (req, res) => res.status(200).send('Import Page'));

// Mock authentication middleware for testing
jest.mock('../middleware/auth', () => ({
    ensureAuthenticated: jest.fn((req, res, next) => next()),
    ensureRoles: jest.fn((roles) => (req, res, next) => next())
}));

// Connect to MongoDB
beforeAll(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
    } catch (err) {
        console.error('MongoDB connection error:', err);
        throw err;
    }
});

afterEach(async () => {
    // Clean up any test data after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
});

afterAll(async () => {
    try {
        await mongoose.connection.close();
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        throw err;
    }
});

describe('Server Routes', () => {
    it('should return 200 for the home page', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
    });

    it('should return 200 for the users route', async () => {
        const res = await request(app).get('/users');
        expect(res.statusCode).toEqual(200);
    });

    it('should return 200 for the claims route', async () => {
        const res = await request(app).get('/claims');
        expect(res.statusCode).toEqual(200);
    });

    it('should return 200 for the dashboard route', async () => {
        const res = await request(app).get('/dashboard');
        expect(res.statusCode).toEqual(200);
    });

    it('should return 200 for the API route', async () => {
        const res = await request(app).get('/api');
        expect(res.statusCode).toEqual(200);
    });

    it('should return 200 for the feedback route', async () => {
        const res = await request(app).get('/feedback');
        expect(res.statusCode).toEqual(200);
    });

    it('should return 200 for the customers route', async () => {
        const res = await request(app).get('/customers');
        expect(res.statusCode).toEqual(200);
    });

    it('should return 200 for the employee route', async () => {
        const res = await request(app).get('/employee');
        expect(res.statusCode).toEqual(200);
    });

    it('should return 200 for the email route', async () => {
        const res = await request(app).get('/email');
        expect(res.statusCode).toEqual(200);
    });

    it('should return 200 for the reports route', async () => {
        const res = await request(app).get('/reports');
        expect(res.statusCode).toEqual(200);
    });

    it('should return 200 for the email-templates route', async () => {
        const res = await request(app).get('/email-templates');
        expect(res.statusCode).toEqual(200);
    });

    it('should return 200 for the export route', async () => {
        const res = await request(app).get('/export');
        expect(res.statusCode).toEqual(200);
    });

    it('should return 200 for the import route', async () => {
        const res = await request(app).get('/import');
        expect(res.statusCode).toEqual(200);
    });

    // Additional tests
    it('should return 404 for an unknown route', async () => {
        const res = await request(app).get('/unknown-route');
        expect(res.statusCode).toEqual(404);
    });

    it('should handle POST requests to the feedback route', async () => {
        const res = await request(app)
            .post('/feedback')
            .send({ feedback: 'This is a test feedback' });
        expect(res.statusCode).toEqual(200);
    });

    it('should handle PUT requests to the users route', async () => {
        const res = await request(app)
            .put('/users/1')
            .send({ name: 'Updated User' });
        expect(res.statusCode).toEqual(200);
    });

    it('should handle DELETE requests to the users route', async () => {
        const res = await request(app).delete('/users/1');
        expect(res.statusCode).toEqual(200);
    });

    describe('Response Content', () => {
        it('should return proper content type headers', async () => {
            const res = await request(app).get('/');
            expect(res.headers['content-type']).toMatch(/text\/html/);
        });

        it('should return JSON for API endpoints', async () => {
            const res = await request(app)
                .get('/api')
                .set('Accept', 'application/json');
            expect(res.headers['content-type']).toMatch(/json/);
        });
    });
});

describe('Error Handling', () => {
    it('should handle server errors with 500 status code', async () => {
        // Mock a route that throws an error
        app.get('/error-test', () => {
            throw new Error('Test error');
        });

        const res = await request(app).get('/error-test');
        expect(res.statusCode).toEqual(500);
    });
});

describe('Middleware', () => {
    it('should properly set flash messages', async () => {
        const agent = request.agent(app);
        
        await agent
            .get('/')
            .expect(200)
            .expect((res) => {
                expect(res.locals).toBeDefined();
                expect(res.locals.success_msg).toBeDefined();
                expect(res.locals.error_msg).toBeDefined();
                expect(res.locals.error).toBeDefined();
            });
    });
});

describe('Authentication', () => {
    it('should protect authenticated routes', async () => {
        // Temporarily remove the mock to test real authentication
        jest.unmock('../middleware/auth');
        
        const protectedRoutes = [
            '/dashboard',
            '/claims',
            '/reports',
            '/export'
        ];

        for (const route of protectedRoutes) {
            const res = await request(app).get(route);
            expect(res.statusCode).toEqual(302); // Should redirect to login
        }

        // Restore the mock
        jest.mock('../middleware/auth', () => ({
            ensureAuthenticated: jest.fn((req, res, next) => next()),
            ensureRoles: jest.fn((roles) => (req, res, next) => next())
        }));
    });
});

describe('HTTP Methods', () => {
    const testData = { name: 'Test User', email: 'test@example.com' };

    it('should handle POST requests with proper data', async () => {
        const res = await request(app)
            .post('/feedback')
            .send(testData)
            .set('Accept', 'application/json');
        
        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toMatch(/json/);
    });

    it('should handle PUT requests with proper data', async () => {
        const res = await request(app)
            .put('/users/1')
            .send(testData)
            .set('Accept', 'application/json');
        
        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toMatch(/json/);
    });

    it('should handle DELETE requests properly', async () => {
        const res = await request(app)
            .delete('/users/1')
            .set('Accept', 'application/json');
        
        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toMatch(/json/);
    });

    it('should reject invalid content types', async () => {
        const res = await request(app)
            .post('/feedback')
            .send('invalid data')
            .set('Content-Type', 'text/plain');
        
        expect(res.statusCode).toEqual(400);
    });
});