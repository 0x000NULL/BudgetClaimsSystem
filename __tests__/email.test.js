const request = require('supertest');
const express = require('express');
const emailRoutes = require('../routes/email');
const EmailTemplate = require('../models/EmailTemplate');
const Claim = require('../models/Claim');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');

const app = express();
app.use(express.json());
app.use('/email', emailRoutes);

// Mock middleware
jest.mock('../middleware/auth', () => ({
    ensureAuthenticated: (req, res, next) => next(),
    ensureRoles: (roles) => (req, res, next) => next(),
}));

// Mock models
jest.mock('../models/EmailTemplate');
jest.mock('../models/Claim');

describe('Email Routes', () => {
    describe('GET /email/form/:id', () => {
        it('should display the email form', async () => {
            const mockClaim = { _id: '1', customerName: 'John Doe' };
            const mockTemplates = [{ _id: '1', subject: 'Test', body: 'Hello {CustomerName}' }];

            Claim.findById.mockResolvedValue(mockClaim);
            EmailTemplate.find.mockResolvedValue(mockTemplates);

            const res = await request(app).get('/email/form/1');

            expect(res.status).toBe(200);
            expect(res.text).toContain('John Doe');
            expect(res.text).toContain('Test');
        });

        it('should handle errors', async () => {
            Claim.findById.mockRejectedValue(new Error('Error'));

            const res = await request(app).get('/email/form/1');

            expect(res.status).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    describe('GET /email/templates/:templateId', () => {
        it('should get a specific email template and replace variables', async () => {
            const mockTemplate = { _id: '1', subject: 'Test', body: 'Hello {CustomerName}' };
            const mockClaim = { _id: '1', customerName: 'John Doe' };

            EmailTemplate.findById.mockResolvedValue(mockTemplate);
            Claim.findById.mockResolvedValue(mockClaim);

            const res = await request(app).get('/email/templates/1').query({ claimId: '1' });

            expect(res.status).toBe(200);
            expect(res.body.body).toBe('Hello John Doe');
        });

        it('should handle errors', async () => {
            EmailTemplate.findById.mockRejectedValue(new Error('Error'));

            const res = await request(app).get('/email/templates/1').query({ claimId: '1' });

            expect(res.status).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    describe('GET /email/send/:claimId', () => {
        it('should display the email sending form', async () => {
            const mockClaim = { _id: '1', customerName: 'John Doe' };
            const mockTemplates = [{ _id: '1', subject: 'Test', body: 'Hello {CustomerName}' }];

            Claim.findById.mockResolvedValue(mockClaim);
            EmailTemplate.find.mockResolvedValue(mockTemplates);

            const res = await request(app).get('/email/send/1');

            expect(res.status).toBe(200);
            expect(res.text).toContain('John Doe');
            expect(res.text).toContain('Test');
        });

        it('should handle errors', async () => {
            Claim.findById.mockRejectedValue(new Error('Error'));

            const res = await request(app).get('/email/send/1');

            expect(res.status).toBe(500);
            expect(res.text).toBe('Server Error');
        });
    });

    describe('POST /email/send', () => {
        it('should send an email', async () => {
            const mockTransporter = {
                sendMail: jest.fn((mailOptions, callback) => callback(null, { messageId: '123' })),
            };
            jest.mock('nodemailer', () => ({
                createTransport: () => mockTransporter,
            }));

            const res = await request(app)
                .post('/email/send')
                .send({ email: 'test@example.com', subject: 'Test', body: 'Hello' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe('Email sent successfully');
        });

        it('should handle errors', async () => {
            const mockTransporter = {
                sendMail: jest.fn((mailOptions, callback) => callback(new Error('Error'), null)),
            };
            jest.mock('nodemailer', () => ({
                createTransport: () => mockTransporter,
            }));

            const res = await request(app)
                .post('/email/send')
                .send({ email: 'test@example.com', subject: 'Test', body: 'Hello' });

            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Failed to send email');
        });
    });
});