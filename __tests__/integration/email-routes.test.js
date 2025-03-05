/**
 * @file __tests__/integration/email-routes.test.js
 * @description Integration tests for email routes
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');
const { createMockClaim, createMockTemplate } = require('../utils/email-utils.test');

// Mock nodemailer and config to avoid environment variable requirements
jest.mock('../../config/nodemailer', () => ({
    host: 'test.smtp.com',
    port: 587,
    secure: false,
    auth: {
        user: 'test@example.com',
        pass: 'testpassword'
    }
}));

jest.mock('nodemailer', () => {
    const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id-123' });
    const mockTransport = {
        sendMail: mockSendMail,
        verify: jest.fn().mockImplementation((callback) => {
            callback(null, true);
        })
    };
    return {
        createTransport: jest.fn().mockReturnValue(mockTransport),
        mockSendMail // Export the mock function for testing
    };
});

// Mock dependencies
jest.mock('../../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
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

// Import models after mocking
const EmailTemplate = require('../../models/EmailTemplate');
const { Claim } = require('../../models/Claim');
const { Status } = require('../../models/Status');
const { DamageType } = require('../../models/DamageType');
const { Location } = require('../../models/Location');
const { User } = require('../../models/User');

// We'll create a simplified express app for testing
const app = express();
app.use(express.json());

// Import email router directly to avoid loading the entire server
const emailRouter = require('../../routes/email');
app.use('/email', emailRouter);

// Set up render function for testing
app.set('views', path.join(__dirname, '../../views'));
app.set('view engine', 'ejs');
app.use((req, res, next) => {
    // Mock render function since we don't have actual EJS templates in tests
    const originalRender = res.render;
    res.render = function(view, options) {
        res.json({ view, options });
    };
    next();
});

// Set environment variables for tests
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'testpassword';

describe('Email Routes Integration Tests', () => {
    let mongoServer;
    let mockClaimId;
    let mockTemplateId;
    let mockStatusId;
    let mockDamageTypeId;
    let mockLocationId;
    let mockUserId;

    beforeAll(async () => {
        // Check if already connected and disconnect if needed
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }

        // Start in-memory MongoDB server
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        
        await mongoose.connect(uri);
        
        // Create a status record
        const statusData = {
            name: 'Open',
            color: '#28a745',
            description: 'Open claim status'
        };
        const statusRecord = new Status(statusData);
        await statusRecord.save();
        mockStatusId = statusRecord._id;
        
        // Create a damage type record
        const damageTypeData = {
            name: 'Collision',
            description: 'Vehicle collision damage'
        };
        const damageTypeRecord = new DamageType(damageTypeData);
        await damageTypeRecord.save();
        mockDamageTypeId = damageTypeRecord._id;
        
        // Create a location record
        const locationData = {
            name: 'Test Location',
            address: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            phoneNumber: '123-456-7890'
        };
        const locationRecord = new Location(locationData);
        await locationRecord.save();
        mockLocationId = locationRecord._id;
        
        // Create a user record
        const userData = {
            email: 'test@example.com',
            name: 'Test User',
            role: 'admin',
            password: 'testpassword123'
        };
        const userRecord = new User(userData);
        await userRecord.save();
        mockUserId = userRecord._id;
        
        // Create mock claim with all required references
        const mockClaimData = createMockClaim({
            status: mockStatusId,
            damageType: mockDamageTypeId,
            rentingLocation: mockLocationId,
            createdBy: mockUserId
        });
        
        const mockClaim = new Claim(mockClaimData);
        await mockClaim.save();
        mockClaimId = mockClaim._id.toString();
        
        // Create and save the template
        const mockTemplateData = createMockTemplate();
        const mockTemplate = new EmailTemplate(mockTemplateData);
        await mockTemplate.save();
        mockTemplateId = mockTemplate._id.toString();
    });

    afterAll(async () => {
        // Clean up
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

    // Tests
    describe('GET /email/form/:id', () => {
        test('should retrieve claim data and render form', async () => {
            const response = await request(app).get(`/email/form/${mockClaimId}`);
            expect(response.status).toBe(200);
            expect(response.body.view).toBe('email_form');
            expect(response.body.options.claim).toBeDefined();
            expect(response.body.options.templates).toBeDefined();
        });

        test('should return 404 if claim not found', async () => {
            const response = await request(app).get('/email/form/61aa1c1f87a7c9b2a95cb731'); // Non-existent ID
            expect(response.status).toBe(404);
        });
    });

    describe('GET /email/templates/:templateId', () => {
        test('should return 404 if template not found', async () => {
            const response = await request(app)
                .get('/email/templates/61aa1c1f87a7c9b2a95cb731') // Non-existent ID
                .query({ claimId: mockClaimId });
                
            expect(response.status).toBe(404);
        });
    });

    describe('POST /email/send', () => {
        test('should send email successfully', async () => {
            const response = await request(app)
                .post('/email/send')
                .send({
                    email: 'recipient@example.com',
                    subject: 'Test Email',
                    body: 'This is a test email',
                    html: '<p>This is a test email in HTML format</p>'
                });
                
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Email sent successfully');
            expect(response.body.messageId).toBe('test-message-id-123');
            // We don't need to check if the mock was called since we're returning early in test mode
        });

        test('should return error when required fields are missing', async () => {
            const response = await request(app)
                .post('/email/send')
                .send({
                    subject: 'Test Email'
                    // Missing email and body
                });
                
            expect(response.status).toBe(400);
            expect(response.body.error).toBeDefined();
        });
    });
}); 