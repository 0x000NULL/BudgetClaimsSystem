const request = require('supertest');
const app = require('../server');
const EmailTemplate = require('../models/EmailTemplate');

describe('Email Templates Routes', () => {
  it('should create a new email template', async () => {
    const res = await request(app)
      .post('/email-templates')
      .send({
        name: 'Test Template',
        subject: 'Test Subject',
        body: 'This is a test template.'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
  });

  it('should get a list of email templates', async () => {
    await EmailTemplate.create({
      name: 'Test Template',
      subject: 'Test Subject',
      body: 'This is a test template.'
    });

    const res = await request(app).get('/email-templates');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get a single email template by ID', async () => {
    const template = await EmailTemplate.create({
      name: 'Test Template',
      subject: 'Test Subject',
      body: 'This is a test template.'
    });

    const res = await request(app).get(`/email-templates/${template._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('_id', template._id.toString());
  });

  it('should update an email template', async () => {
    const template = await EmailTemplate.create({
      name: 'Test Template',
      subject: 'Test Subject',
      body: 'This is a test template.'
    });

    const res = await request(app)
      .put(`/email-templates/${template._id}`)
      .send({ subject: 'Updated Subject' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('subject', 'Updated Subject');
  });

  it('should delete an email template', async () => {
    const template = await EmailTemplate.create({
      name: 'Test Template',
      subject: 'Test Subject',
      body: 'This is a test template.'
    });

    const res = await request(app).delete(`/email-templates/${template._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('msg', 'Email Template deleted');
  });
});
