const request = require('supertest');
const express = require('express');
const emailTemplatesRouter = require('../routes/emailTemplates');
const EmailTemplate = require('../models/EmailTemplate');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const pinoLogger = require('../logger');

// Create Express app for testing
const app = express();

// Mock dependencies
jest.mock('../models/EmailTemplate');
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
app.use('/email-templates', emailTemplatesRouter);

describe('Email Templates Routes', () => {
    let mockUser;
    let mockTemplate;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock user
        mockUser = {
            id: 'testUserId',
            email: 'test@example.com',
            role: 'admin'
        };

        // Setup mock template
        mockTemplate = {
            _id: 'template123',
            name: 'Test Template',
            subject: 'Test Subject',
            body: 'Test Body',
            save: jest.fn().mockResolvedValue(true)
        };

        // Setup default auth middleware behavior
        ensureAuthenticated.mockImplementation((req, res, next) => {
            req.user = mockUser;
            next();
        });
        ensureRoles.mockImplementation((roles) => (req, res, next) => next());
    });

    describe('GET /email-templates', () => {
        it('should render email templates list for authorized users', async () => {
            EmailTemplate.find.mockResolvedValue([mockTemplate]);

            const res = await request(app)
                .get('/email-templates')
                .expect(200);

            expect(res.text).toContain('Email Templates');
            expect(EmailTemplate.find).toHaveBeenCalled();
            expect(pinoLogger.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Fetching email templates'
                })
            );
        });

        it('should handle unauthorized access', async () => {
            ensureRoles.mockImplementation(() => (req, res, next) => {
                res.status(403).json({ error: 'Unauthorized' });
            });

            await request(app)
                .get('/email-templates')
                .expect(403);
        });

        it('should handle database errors', async () => {
            EmailTemplate.find.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .get('/email-templates')
                .expect(500);

            expect(res.text).toContain('Internal Server Error');
            expect(pinoLogger.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Error fetching email templates',
                    error: expect.any(Error)
                })
            );
        });
    });

    describe('GET /email-templates/add', () => {
        it('should render add template form for admin users', async () => {
            const res = await request(app)
                .get('/email-templates/add')
                .expect(200);

            expect(res.text).toContain('Add Email Template');
            expect(pinoLogger.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Add email template route accessed'
                })
            );
        });

        it('should handle unauthorized access', async () => {
            ensureRoles.mockImplementation(() => (req, res, next) => {
                res.status(403).json({ error: 'Unauthorized' });
            });

            await request(app)
                .get('/email-templates/add')
                .expect(403);
        });
    });

    describe('POST /email-templates/add', () => {
        const validTemplate = {
            name: 'New Template',
            subject: 'New Subject',
            body: 'New Body'
        };

        it('should create new template with valid data', async () => {
            EmailTemplate.prototype.save.mockResolvedValue(validTemplate);

            const res = await request(app)
                .post('/email-templates/add')
                .send(validTemplate)
                .expect(302);

            expect(res.header.location).toBe('/email-templates');
            expect(EmailTemplate.prototype.save).toHaveBeenCalled();
            expect(pinoLogger.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Creating new email template'
                })
            );
        });

        it('should handle validation errors', async () => {
            const invalidTemplate = { name: '' };
            EmailTemplate.prototype.save.mockRejectedValue(new Error('Validation error'));

            const res = await request(app)
                .post('/email-templates/add')
                .send(invalidTemplate)
                .expect(500);

            expect(res.text).toContain('Internal Server Error');
            expect(pinoLogger.info).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Error creating email template',
                    error: expect.any(Error)
                })
            );
        });
    });

    describe('GET /email-templates/:id/edit', () => {
        it('should render edit form with template data', async () => {
            EmailTemplate.findById.mockResolvedValue(mockTemplate);

            const res = await request(app)
                .get(`/email-templates/${mockTemplate._id}/edit`)
                .expect(200);

            expect(res.text).toContain('Edit Email Template');
            expect(EmailTemplate.findById).toHaveBeenCalledWith(mockTemplate._id);
        });

        it('should handle non-existent template', async () => {
            EmailTemplate.findById.mockResolvedValue(null);

            const res = await request(app)
                .get('/email-templates/nonexistent/edit')
                .expect(404);

            expect(res.text).toContain('Email template not found');
        });

        it('should handle database errors', async () => {
            EmailTemplate.findById.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .get(`/email-templates/${mockTemplate._id}/edit`)
                .expect(500);

            expect(res.text).toContain('Internal Server Error');
        });
    });

    describe('POST /email-templates/:id/edit', () => {
        const updatedData = {
            name: 'Updated Template',
            subject: 'Updated Subject',
            body: 'Updated Body'
        };

        it('should update template with valid data', async () => {
            EmailTemplate.findById.mockResolvedValue(mockTemplate);

            const res = await request(app)
                .post(`/email-templates/${mockTemplate._id}/edit`)
                .send(updatedData)
                .expect(302);

            expect(res.header.location).toBe('/email-templates');
            expect(mockTemplate.save).toHaveBeenCalled();
        });

        it('should handle non-existent template', async () => {
            EmailTemplate.findById.mockResolvedValue(null);

            const res = await request(app)
                .post('/email-templates/nonexistent/edit')
                .send(updatedData)
                .expect(404);

            expect(res.text).toContain('Email template not found');
        });

        it('should handle validation errors', async () => {
            EmailTemplate.findById.mockResolvedValue(mockTemplate);
            mockTemplate.save.mockRejectedValue(new Error('Validation error'));

            const res = await request(app)
                .post(`/email-templates/${mockTemplate._id}/edit`)
                .send({ name: '' })
                .expect(500);

            expect(res.text).toContain('Internal Server Error');
        });
    });

    describe('POST /email-templates/:id/delete', () => {
        it('should delete existing template', async () => {
            EmailTemplate.findByIdAndDelete.mockResolvedValue(mockTemplate);

            const res = await request(app)
                .post(`/email-templates/${mockTemplate._id}/delete`)
                .expect(302);

            expect(res.header.location).toBe('/email-templates');
            expect(EmailTemplate.findByIdAndDelete).toHaveBeenCalledWith(mockTemplate._id);
        });

        it('should handle database errors during deletion', async () => {
            EmailTemplate.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .post(`/email-templates/${mockTemplate._id}/delete`)
                .expect(500);

            expect(res.text).toContain('Internal Server Error');
        });

        it('should handle unauthorized deletion attempts', async () => {
            ensureRoles.mockImplementation(() => (req, res, next) => {
                res.status(403).json({ error: 'Unauthorized' });
            });

            await request(app)
                .post(`/email-templates/${mockTemplate._id}/delete`)
                .expect(403);
        });
    });
});