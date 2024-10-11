const request = require('supertest');
const express = require('express');
const emailTemplatesRouter = require('../routes/emailTemplates');
const EmailTemplate = require('../models/EmailTemplate');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');

jest.mock('../models/EmailTemplate');
jest.mock('../middleware/auth');

const app = express();
app.use(express.json());
app.use('/email-templates', emailTemplatesRouter);

describe('Email Templates Routes', () => {
    beforeEach(() => {
        ensureAuthenticated.mockImplementation((req, res, next) => next());
        ensureRoles.mockImplementation((roles) => (req, res, next) => next());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /email-templates', () => {
        it('should list all email templates', async () => {
            const mockTemplates = [{ name: 'Template1', subject: 'Subject1', body: 'Body1' }];
            EmailTemplate.find.mockResolvedValue(mockTemplates);

            const response = await request(app).get('/email-templates');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Email Templates');
            expect(EmailTemplate.find).toHaveBeenCalled();
        });

        it('should handle errors when listing email templates', async () => {
            EmailTemplate.find.mockRejectedValue(new Error('Database error'));

            const response = await request(app).get('/email-templates');

            expect(response.status).toBe(500);
            expect(response.text).toContain('Internal Server Error');
        });
    });

    describe('GET /email-templates/add', () => {
        it('should display the add email template form', async () => {
            const response = await request(app).get('/email-templates/add');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Add Email Template');
        });
    });

    describe('POST /email-templates/add', () => {
        it('should create a new email template', async () => {
            const newTemplate = { name: 'Template1', subject: 'Subject1', body: 'Body1' };
            EmailTemplate.prototype.save.mockResolvedValue(newTemplate);

            const response = await request(app)
                .post('/email-templates/add')
                .send(newTemplate);

            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('/email-templates');
            expect(EmailTemplate.prototype.save).toHaveBeenCalled();
        });

        it('should handle errors when creating a new email template', async () => {
            EmailTemplate.prototype.save.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/email-templates/add')
                .send({ name: 'Template1', subject: 'Subject1', body: 'Body1' });

            expect(response.status).toBe(500);
            expect(response.text).toContain('Internal Server Error');
        });
    });

    describe('GET /email-templates/:id/edit', () => {
        it('should display the edit email template form', async () => {
            const mockTemplate = { _id: '1', name: 'Template1', subject: 'Subject1', body: 'Body1' };
            EmailTemplate.findById.mockResolvedValue(mockTemplate);

            const response = await request(app).get('/email-templates/1/edit');

            expect(response.status).toBe(200);
            expect(response.text).toContain('Edit Email Template');
            expect(EmailTemplate.findById).toHaveBeenCalledWith('1');
        });

        it('should handle errors when fetching email template for editing', async () => {
            EmailTemplate.findById.mockRejectedValue(new Error('Database error'));

            const response = await request(app).get('/email-templates/1/edit');

            expect(response.status).toBe(500);
            expect(response.text).toContain('Internal Server Error');
        });

        it('should return 404 if email template not found', async () => {
            EmailTemplate.findById.mockResolvedValue(null);

            const response = await request(app).get('/email-templates/1/edit');

            expect(response.status).toBe(404);
            expect(response.text).toContain('Email template not found');
        });
    });

    describe('POST /email-templates/:id/edit', () => {
        it('should update an email template', async () => {
            const mockTemplate = { _id: '1', name: 'Template1', subject: 'Subject1', body: 'Body1' };
            EmailTemplate.findById.mockResolvedValue(mockTemplate);
            EmailTemplate.prototype.save.mockResolvedValue(mockTemplate);

            const response = await request(app)
                .post('/email-templates/1/edit')
                .send({ name: 'Updated Template', subject: 'Updated Subject', body: 'Updated Body' });

            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('/email-templates');
            expect(EmailTemplate.findById).toHaveBeenCalledWith('1');
            expect(EmailTemplate.prototype.save).toHaveBeenCalled();
        });

        it('should handle errors when updating an email template', async () => {
            EmailTemplate.findById.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/email-templates/1/edit')
                .send({ name: 'Updated Template', subject: 'Updated Subject', body: 'Updated Body' });

            expect(response.status).toBe(500);
            expect(response.text).toContain('Internal Server Error');
        });

        it('should return 404 if email template not found', async () => {
            EmailTemplate.findById.mockResolvedValue(null);

            const response = await request(app)
                .post('/email-templates/1/edit')
                .send({ name: 'Updated Template', subject: 'Updated Subject', body: 'Updated Body' });

            expect(response.status).toBe(404);
            expect(response.text).toContain('Email template not found');
        });
    });

    describe('POST /email-templates/:id/delete', () => {
        it('should delete an email template', async () => {
            EmailTemplate.findByIdAndDelete.mockResolvedValue({});

            const response = await request(app).post('/email-templates/1/delete');

            expect(response.status).toBe(302);
            expect(response.headers.location).toBe('/email-templates');
            expect(EmailTemplate.findByIdAndDelete).toHaveBeenCalledWith('1');
        });

        it('should handle errors when deleting an email template', async () => {
            EmailTemplate.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

            const response = await request(app).post('/email-templates/1/delete');

            expect(response.status).toBe(500);
            expect(response.text).toContain('Internal Server Error');
        });
    });
});