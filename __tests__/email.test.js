const request = require('supertest');
const app = require('../server');

describe('Email Routes', () => {
  it('should send an email', async () => {
    const res = await request(app)
      .post('/email/send')
      .send({
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email.'
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('msg', 'Email sent successfully');
  });
});
