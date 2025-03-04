/**
 * @fileoverview Tests for email routes
 */

const request = require('supertest');
const express = require('express');
const { mockObjectId, setupMiddleware, mockAuthMiddleware, mockErrorHandler } = require('./__mocks__/common');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'testpass';

// Mock dependencies
jest.mock('../../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

jest.mock('../../middleware/auth', () => ({
    ensureAuthenticated: jest.fn((req, res, next) => next()),
    ensureRoles: jest.fn(() => (req, res, next) => next())
}));

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockImplementation((mailOptions, callback) => {
            callback(null, { messageId: 'test-message-id' });
        })
    })
}));

// Mock Claim model
const mockClaim = {
    _id: mockObjectId,
    mva: 'MVA123',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerNumber: '123-456-7890',
    customerAddress: '123 Main St',
    customerDriversLicense: 'DL12345',
    carMake: 'Toyota',
    carModel: 'Camry',
    carYear: '2020',
    carColor: 'Blue',
    carVIN: 'VIN12345',
    accidentDate: new Date('2023-01-01'),
    billable: true,
    isRenterAtFault: false,
    damagesTotal: 1500,
    bodyShopName: 'Auto Repair Shop',
    raNumber: 'RA123',
    insuranceCarrier: 'Insurance Co',
    insuranceAgent: 'Agent Name',
    insurancePhoneNumber: '555-123-4567',
    insuranceFaxNumber: '555-123-4568',
    insuranceAddress: '456 Insurance St',
    insuranceClaimNumber: 'IC123',
    thirdPartyName: 'Third Party',
    thirdPartyPhoneNumber: '555-987-6543',
    thirdPartyInsuranceName: 'TP Insurance',
    thirdPartyPolicyNumber: 'TP123'
};

jest.mock('../../models/Claim', () => ({
    findById: jest.fn().mockImplementation((id) => {
        if (id === mockObjectId) {
            return {
                exec: jest.fn().mockResolvedValue(mockClaim)
            };
        }
        return {
            exec: jest.fn().mockResolvedValue(null)
        };
    })
}));

// Mock EmailTemplate model
const mockTemplates = [
    {
        _id: mockObjectId,
        name: 'Welcome Email',
        subject: 'Welcome to Budget Claims System',
        body: 'Dear {CustomerName}, welcome to Budget Claims System. Your claim number is {MVA}.',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
    }
];

jest.mock('../../models/EmailTemplate', () => ({
    find: jest.fn().mockImplementation(() => {
        return {
            exec: jest.fn().mockResolvedValue(mockTemplates)
        };
    }),
    findById: jest.fn().mockImplementation((id) => {
        if (id === mockObjectId) {
            return Promise.resolve(mockTemplates[0]);
        }
        return Promise.resolve(null);
    })
}));

// Import routes
const emailRouter = require('../../routes/email');

describe('Email Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        setupMiddleware(app);
        app.use(mockAuthMiddleware('admin'));
        
        app.use('/email', emailRouter);
        
        // Mock render and redirect
        app.response.render = jest.fn().mockImplementation(function(view, options) {
            this.send(`Rendered ${view}`);
        });
        
        app.response.redirect = jest.fn().mockImplementation(function(url) {
            this.send(`Redirected to ${url}`);
        });
        
        mockErrorHandler(app);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /email/form/:id', () => {
        test('should render email form with claim data', async () => {
            const response = await request(app).get(`/email/form/${mockObjectId}`);
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered email_form');
        });
        
        test('should handle server error', async () => {
            // Mock Claim.findById to throw an error
            require('../../models/Claim').findById.mockRejectedValueOnce(new Error('Database error'));
            
            const response = await request(app).get(`/email/form/${mockObjectId}`);
            
            expect(response.status).toBe(500);
            expect(response.text).toContain('Server Error');
        });
    });

    describe('GET /email/templates/:templateId', () => {
        test('should return populated template with claim data', async () => {
            const response = await request(app)
                .get(`/email/templates/${mockObjectId}`)
                .query({ claimId: mockObjectId });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('subject');
            expect(response.body).toHaveProperty('body');
        });
        
        test('should handle server error', async () => {
            // Mock EmailTemplate.findById to throw an error
            require('../../models/EmailTemplate').findById.mockRejectedValueOnce(new Error('Database error'));
            
            const response = await request(app)
                .get(`/email/templates/${mockObjectId}`)
                .query({ claimId: mockObjectId });
            
            expect(response.status).toBe(500);
            expect(response.text).toContain('Server Error');
        });
    });

    describe('GET /email/send/:claimId', () => {
        test('should render email sending form with claim data', async () => {
            const response = await request(app).get(`/email/send/${mockObjectId}`);
            
            expect(response.status).toBe(200);
            expect(response.text).toContain('Rendered email_form');
        });
        
        test('should handle server error', async () => {
            // Mock Claim.findById to throw an error
            require('../../models/Claim').findById.mockImplementation(() => ({
                exec: jest.fn().mockRejectedValue(new Error('Database error'))
            }));
            
            const response = await request(app).get(`/email/send/${mockObjectId}`);
            
            expect(response.status).toBe(500);
            expect(response.text).toContain('Server Error');
        });
    });

    describe('POST /email/send', () => {
        test('should send email successfully', async () => {
            const emailData = {
                email: 'recipient@example.com',
                subject: 'Test Subject',
                body: 'Test Body'
            };
            
            const response = await request(app)
                .post('/email/send')
                .send(emailData);
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success');
        });
        
        test('should handle email sending error', async () => {
            // Mock nodemailer to simulate an error
            const nodemailer = require('nodemailer');
            nodemailer.createTransport.mockReturnValueOnce({
                sendMail: jest.fn().mockImplementation((mailOptions, callback) => {
                    callback(new Error('Failed to send email'), null);
                })
            });
            
            const emailData = {
                email: 'recipient@example.com',
                subject: 'Test Subject',
                body: 'Test Body'
            };
            
            const response = await request(app)
                .post('/email/send')
                .send(emailData);
            
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });
}); 