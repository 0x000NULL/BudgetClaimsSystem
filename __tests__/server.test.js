const express = require('express');
const request = require('supertest');
const session = require('express-session');
const passport = require('passport');
const helmet = require('helmet');
const cors = require('cors');

describe('Server Configuration', () => {
    let app;

    beforeEach(() => {
        app = express();
    });

    describe('Basic Server Setup', () => {
        it('should initialize express application', () => {
            expect(app).toBeDefined();
            app.set('view engine', 'ejs');
            expect(app.get('view engine')).toBe('ejs');
        });

        it('should configure basic middleware', async () => {
            app.use(express.json());
            app.use(express.urlencoded({ extended: false }));
            app.get('/', (req, res) => res.send('OK'));

            const response = await request(app).get('/');
            expect(response.status).toBe(200);
            expect(response.text).toBe('OK');
        });
    });

    describe('Security Configuration', () => {
        it('should apply security headers', async () => {
            app.use(helmet());
            app.get('/', (req, res) => res.send('OK'));

            const response = await request(app).get('/');
            expect(response.headers).toHaveProperty('x-frame-options');
            expect(response.headers).toHaveProperty('x-content-type-options');
        });

        it('should handle CORS', async () => {
            app.use(cors());
            app.get('/', (req, res) => res.send('OK'));

            const response = await request(app)
                .get('/')
                .set('Origin', 'http://example.com');
            expect(response.headers).toHaveProperty('access-control-allow-origin');
        });
    });

    describe('Session Configuration', () => {
        it('should handle sessions', async () => {
            app.use(session({
                secret: 'test-secret',
                resave: false,
                saveUninitialized: false
            }));

            app.get('/', (req, res) => {
                req.session.views = (req.session.views || 0) + 1;
                res.json({ views: req.session.views });
            });

            const agent = request.agent(app);
            const response = await agent.get('/');
            expect(response.status).toBe(200);
            expect(response.body.views).toBe(1);
        });
    });

    describe('Authentication', () => {
        it('should initialize passport middleware', async () => {
            app.use(session({
                secret: 'test-secret',
                resave: false,
                saveUninitialized: false
            }));
            app.use(passport.initialize());
            app.use(passport.session());
            app.get('/', (req, res) => res.send('OK'));

            const response = await request(app).get('/');
            expect(response.status).toBe(200);
        });
    });

    describe('Error Handling', () => {
        it('should handle errors', async () => {
            app.get('/error', (req, res, next) => {
                next(new Error('Test error'));
            });

            app.use((err, req, res, next) => {
                res.status(500).json({ error: err.message });
            });

            const response = await request(app).get('/error');
            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Test error');
        });
    });

    describe('404 Handling', () => {
        it('should handle 404 errors', async () => {
            app.use((req, res) => {
                res.status(404).json({ error: 'Not Found' });
            });

            const response = await request(app).get('/nonexistent');
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Not Found');
        });
    });
}); 