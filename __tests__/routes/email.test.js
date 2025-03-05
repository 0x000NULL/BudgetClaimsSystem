/**
 * @file __tests__/routes/email.test.js
 * @description Test suite for email routes and utility functions
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');

// Mock models before requiring them
jest.mock('../../models/EmailTemplate', () => ({
    find: jest.fn(),
    findById: jest.fn()
}));

jest.mock('../../models/Claim', () => {
    const mockFindById = jest.fn();
    return {
        Claim: {
            findById: mockFindById
        }
    };
});

// Import the router and models
const emailRouter = require('../../routes/email');
const EmailTemplate = require('../../models/EmailTemplate');
const { Claim } = require('../../models/Claim');

// Import utility functions from our test utils
const { 
    filterSensitiveData,
    replaceVariables,
    createMockClaim,
    createMockTemplate
} = require('../utils/email-utils.test');

// Mock dependencies
jest.mock('../../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

jest.mock('../../config/nodemailer', () => ({
    host: 'test.smtp.com',
    port: 587,
    secure: false,
    auth: {
        user: 'test@example.com',
        pass: 'testpassword'
    }
}));

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockImplementation((mailOptions) => {
            return Promise.resolve({ messageId: 'test-message-id-123' });
        }),
        verify: jest.fn().mockImplementation((callback) => {
            callback(null, true);
        })
    })
}));

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
    ensureAuthenticated: (req, res, next) => {
        req.user = { email: 'test@example.com', id: 'user123' };
        req.sessionID = 'test-session-id';
        next();
    },
    ensureRoles: (roles) => (req, res, next) => {
        next();
    }
}));

// Create Express application for testing
const app = express();
app.use(express.json());
app.use('/email', emailRouter);

// Set up render function for testing
app.set('views', path.join(__dirname, '../../views'));
app.set('view engine', 'ejs');
app.use((req, res, next) => {
    const originalRender = res.render;
    res.render = function(view, options) {
        res.send({ view, options });
    };
    next();
});

/**
 * Helper function to compare claims with date handling
 */
const compareClaimsForTest = (received, expected) => {
    const receivedCopy = JSON.parse(JSON.stringify(received));
    const expectedCopy = JSON.parse(JSON.stringify(expected));
    
    // Compare date fields separately if they exist
    if (receivedCopy.accidentDate && expectedCopy.accidentDate) {
        // Expected behavior: the received date will be a string, expected will be a Date
        const receivedDate = new Date(receivedCopy.accidentDate);
        const expectedDate = new Date(expectedCopy.accidentDate);
        expect(receivedDate.getTime()).toEqual(expectedDate.getTime());
    }
    
    // Remove date fields for the main comparison
    if (receivedCopy.accidentDate) delete receivedCopy.accidentDate;
    if (expectedCopy.accidentDate) delete expectedCopy.accidentDate;
    
    expect(receivedCopy).toEqual(expectedCopy);
};

// Helper function to compare templates with ObjectId handling
const compareTemplatesForTest = (received, expected) => {
    // Convert to plain objects to handle ObjectId differences
    const receivedCopy = JSON.parse(JSON.stringify(received));
    const expectedCopy = JSON.parse(JSON.stringify(expected));
    
    // Compare the objects after stringification
    expect(receivedCopy).toEqual(expectedCopy);
};

// Test data
const mockClaimId = 'claim123';
const mockTemplateId = 'template123';
const mockClaim = {
    _id: mockClaimId,
    mva: 'MVA123',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    carMake: 'Toyota',
    carModel: 'Camry',
    carYear: '2020',
    accidentDate: new Date('2024-01-01')
};

const mockTemplate = {
    _id: mockTemplateId,
    subject: 'Claim {MVA} - {CustomerName}',
    body: 'Dear {CustomerName},\n\nRegarding your claim {MVA} for your {CarYear} {CarMake} {CarModel}.'
};

describe('Email Routes', () => {
    let mongoServer;

    beforeAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }

        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);

        process.env.EMAIL_USER = 'test@example.com';
        process.env.EMAIL_PASS = 'testpassword';
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /form/:id', () => {
        test('should render email form with claim and templates', async () => {
            Claim.findById.mockResolvedValue(mockClaim);
            EmailTemplate.find.mockResolvedValue([mockTemplate]);

            const response = await request(app).get(`/email/form/${mockClaimId}`);
            
            expect(response.status).toBe(200);
            expect(Claim.findById).toHaveBeenCalledWith(mockClaimId);
            expect(EmailTemplate.find).toHaveBeenCalled();
            expect(response.body.view).toBe('email_form');
            
            compareClaimsForTest(response.body.options.claim, mockClaim);
            compareTemplatesForTest(response.body.options.templates[0], mockTemplate);
        });

        test('should return 404 if claim not found', async () => {
            Claim.findById.mockResolvedValue(null);
            
            const response = await request(app).get('/email/form/nonexistent');
            
            expect(response.status).toBe(404);
            expect(response.text).toBe('Claim not found');
        });
    });

    describe('GET /templates/:templateId', () => {
        test('should return populated template with variables replaced', async () => {
            EmailTemplate.findById.mockResolvedValue(mockTemplate);
            Claim.findById.mockResolvedValue(mockClaim);
            
            const response = await request(app)
                .get(`/email/templates/${mockTemplateId}`)
                .query({ claimId: mockClaimId });
            
            expect(response.status).toBe(200);
            expect(EmailTemplate.findById).toHaveBeenCalledWith(mockTemplateId);
            expect(Claim.findById).toHaveBeenCalledWith(mockClaimId);
            expect(response.body.subject).toBe('Claim MVA123 - John Doe');
        });

        test('should return 404 if template not found', async () => {
            EmailTemplate.findById.mockResolvedValue(null);
            
            const response = await request(app)
                .get('/email/templates/nonexistent')
                .query({ claimId: mockClaimId });
            
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Template not found');
        });

        test('should return 404 if claim not found', async () => {
            EmailTemplate.findById.mockResolvedValue(mockTemplate);
            Claim.findById.mockResolvedValue(null);
            
            const response = await request(app)
                .get(`/email/templates/${mockTemplateId}`)
                .query({ claimId: 'nonexistent' });
            
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Claim not found');
        });

        test('should return 500 if database error occurs', async () => {
            EmailTemplate.findById.mockRejectedValue(new Error('Database error'));
            
            const response = await request(app)
                .get(`/email/templates/${mockTemplateId}`)
                .query({ claimId: mockClaimId });
            
            expect(response.status).toBe(500);
            expect(response.body.error).toContain('Server Error');
        });
    });

    describe('GET /send/:claimId', () => {
        test('should render email form with claim and templates', async () => {
            Claim.findById.mockResolvedValue(mockClaim);
            EmailTemplate.find.mockResolvedValue([mockTemplate]);
            
            const response = await request(app).get(`/email/send/${mockClaimId}`);
            
            expect(response.status).toBe(200);
            expect(Claim.findById).toHaveBeenCalledWith(mockClaimId);
            expect(EmailTemplate.find).toHaveBeenCalled();
            expect(response.body.view).toBe('email_form');
            
            compareClaimsForTest(response.body.options.claim, mockClaim);
            compareTemplatesForTest(response.body.options.templates[0], mockTemplate);
        });

        test('should return 404 if claim not found', async () => {
            Claim.findById.mockResolvedValue(null);
            
            const response = await request(app).get('/email/send/nonexistent');
            
            expect(response.status).toBe(404);
            expect(response.text).toBe('Claim not found');
        });

        test('should return 500 if database error occurs', async () => {
            Claim.findById.mockRejectedValue(new Error('Database error'));
            
            const response = await request(app).get(`/email/send/${mockClaimId}`);
            
            expect(response.status).toBe(500);
            expect(response.text).toContain('Server Error');
        });
    });

    describe('POST /send', () => {
        test('should send email successfully', async () => {
            const emailData = {
                email: 'recipient@example.com',
                subject: 'Test Subject',
                body: 'Test Body',
                html: '<p>Test HTML Body</p>'
            };
            
            const response = await request(app)
                .post('/email/send')
                .send(emailData);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Email sent successfully');
            expect(response.body.messageId).toBe('test-message-id-123');
        });
        
        test('should handle attachments when provided', async () => {
            const emailData = {
                email: 'recipient@example.com',
                subject: 'Test Subject with Attachments',
                body: 'Test Body',
                attachments: [
                    { filename: 'test.pdf', content: 'base64-encoded-content' }
                ]
            };
            
            const response = await request(app)
                .post('/email/send')
                .send(emailData);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        
        test('should return 400 if required fields are missing', async () => {
            const invalidData = {};
            
            const response = await request(app)
                .post('/email/send')
                .send(invalidData);
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBeTruthy();
        });
        
        test('should return 500 if email sending fails', async () => {
            const originalNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            
            nodemailer.createTransport = jest.fn().mockReturnValue({
                sendMail: jest.fn().mockRejectedValue(new Error('SMTP error'))
            });
            
            const emailData = {
                email: 'recipient@example.com',
                subject: 'Test Subject',
                body: 'Test Body'
            };
            
            const response = await request(app)
                .post('/email/send')
                .send(emailData);
                
            process.env.NODE_ENV = originalNodeEnv;
            
            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Failed to send email');
            expect(response.body.details).toBe('SMTP error');
        });
    });
}); 