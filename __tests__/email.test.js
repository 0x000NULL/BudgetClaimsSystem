const request = require('supertest');
const express = require('express');
const nodemailer = require('nodemailer');
const emailRoutes = require('../routes/email');
const EmailTemplate = require('../models/EmailTemplate');
const Claim = require('../models/Claim');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const pinoLogger = require('../logger');

// Create Express app for testing
const app = express();

// Mock dependencies
jest.mock('nodemailer');
jest.mock('../models/EmailTemplate');
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
app.use('/email', emailRoutes);

describe('Email Routes', () => {
    let mockUser;
    let mockClaim;
    let mockTemplate;
    let mockTransporter;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock user
        mockUser = {
            id: 'testUserId',
            email: 'test@example.com',
            role: 'admin'
        };

        // Setup mock claim
        mockClaim = {
            _id: 'claim123',
            customerName: 'John Doe',
            customerEmail: 'john@example.com',
            mva: 'MVA123',
            carMake: 'Toyota',
            carModel: 'Camry',
            accidentDate: new Date('2024-01-01')
        };

        // Setup mock template
        mockTemplate = {
            _id: 'template123',
            name: 'Test Template',
            subject: 'Test Subject',
            body: 'Hello {CustomerName}, Your MVA is {MVA}'
        };

        // Setup mock transporter
        mockTransporter = {
            sendMail: jest.fn().mockImplementation((options, callback) => {
                callback(null, { messageId: 'test123' });
            })
        };

        // Setup nodemailer mock
        nodemailer.createTransport.mockReturnValue(mockTransporter);

        // Setup default auth middleware behavior
        ensureAuthenticated.mockImplementation((req, res, next) => {
            req.user = mockUser;
            next();
        });
        ensureRoles.mockImplementation((roles) => (req, res, next) => next());

        // Setup environment variables
        process.env.EMAIL_USER = 'test@example.com';
        process.env.EMAIL_PASS = 'testpass';
    });

    describe('GET /email/form/:id', () => {
        it('should render email form with claim and templates', async () => {
            Claim.findById.mockResolvedValue(mockClaim);
            EmailTemplate.find.mockResolvedValue([mockTemplate]);

            const res = await request(app)
                .get(`/email/form/${mockClaim._id}`)
                .expect(200);

            expect(res.text).toContain('email_form');
            expect(Claim.findById).toHaveBeenCalledWith(mockClaim._id);
            expect(EmailTemplate.find).toHaveBeenCalled();
            expect(pinoLogger.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Displaying email form'
                })
            );
        });

        it('should handle database errors', async () => {
            Claim.findById.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .get(`/email/form/${mockClaim._id}`)
                .expect(500);

            expect(res.text).toBe('Server Error');
            expect(pinoLogger.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Error displaying email form',
                    error: expect.any(Error)
                })
            );
        });
    });

    describe('GET /email/templates/:templateId', () => {
        it('should return populated template with claim variables', async () => {
            EmailTemplate.findById.mockResolvedValue(mockTemplate);
            Claim.findById.mockResolvedValue(mockClaim);

            const res = await request(app)
                .get(`/email/templates/${mockTemplate._id}`)
                .query({ claimId: mockClaim._id })
                .expect(200);

            expect(res.body.body).toBe('Hello John Doe, Your MVA is MVA123');
            expect(EmailTemplate.findById).toHaveBeenCalledWith(mockTemplate._id);
            expect(Claim.findById).toHaveBeenCalledWith(mockClaim._id);
        });

        it('should handle missing template', async () => {
            EmailTemplate.findById.mockResolvedValue(null);

            const res = await request(app)
                .get(`/email/templates/${mockTemplate._id}`)
                .query({ claimId: mockClaim._id })
                .expect(500);

            expect(res.text).toBe('Server Error');
        });

        it('should handle missing claim', async () => {
            EmailTemplate.findById.mockResolvedValue(mockTemplate);
            Claim.findById.mockResolvedValue(null);

            const res = await request(app)
                .get(`/email/templates/${mockTemplate._id}`)
                .query({ claimId: mockClaim._id })
                .expect(500);

            expect(res.text).toBe('Server Error');
        });
    });

    describe('GET /email/send/:claimId', () => {
        it('should render email sending form for authorized users', async () => {
            Claim.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockClaim) });
            EmailTemplate.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([mockTemplate]) });

            const res = await request(app)
                .get(`/email/send/${mockClaim._id}`)
                .expect(200);

            expect(res.text).toContain('email_form');
            expect(Claim.findById).toHaveBeenCalledWith(mockClaim._id);
            expect(EmailTemplate.find).toHaveBeenCalled();
        });

        it('should handle unauthorized access', async () => {
            ensureRoles.mockImplementation(() => (req, res, next) => {
                res.status(403).json({ error: 'Unauthorized' });
            });

            await request(app)
                .get(`/email/send/${mockClaim._id}`)
                .expect(403);
        });

        it('should handle database errors', async () => {
            Claim.findById.mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('Database error')) });

            const res = await request(app)
                .get(`/email/send/${mockClaim._id}`)
                .expect(500);

            expect(res.text).toBe('Server Error');
        });
    });

    describe('POST /email/send', () => {
        const validEmailData = {
            email: 'recipient@example.com',
            subject: 'Test Email',
            body: 'Test Body'
        };

        it('should send email successfully', async () => {
            const res = await request(app)
                .post('/email/send')
                .send(validEmailData)
                .expect(200);

            expect(res.body.success).toBe('Email sent successfully');
            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: validEmailData.email,
                    subject: validEmailData.subject,
                    text: validEmailData.body
                }),
                expect.any(Function)
            );
        });

        it('should handle email sending failure', async () => {
            mockTransporter.sendMail.mockImplementation((options, callback) => {
                callback(new Error('SMTP error'), null);
            });

            const res = await request(app)
                .post('/email/send')
                .send(validEmailData)
                .expect(500);

            expect(res.body.error).toBe('Failed to send email');
        });

        it('should handle missing email configuration', async () => {
            delete process.env.EMAIL_USER;
            delete process.env.EMAIL_PASS;

            const res = await request(app)
                .post('/email/send')
                .send(validEmailData)
                .expect(500);

            expect(res.body.error).toBe('Failed to send email');
        });

        it('should validate email data', async () => {
            const invalidData = {
                email: 'invalid-email',
                subject: '',
                body: ''
            };

            const res = await request(app)
                .post('/email/send')
                .send(invalidData)
                .expect(400);

            expect(res.body.error).toBe('Invalid email data');
        });
    });
});