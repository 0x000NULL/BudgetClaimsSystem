const request = require('supertest');
const app = require('../server');
const Feedback = require('../models/Feedback');

describe('Feedback Routes', () => {
  it('should create new feedback', async () => {
    const res = await request(app)
      .post('/feedback')
      .send({
        user: 'testUser',
        message: 'This is a test feedback'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
  });

  it('should get a list of feedback', async () => {
    await Feedback.create({
      user: 'testUser',
      message: 'This is a test feedback'
    });

    const res = await request(app).get('/feedback');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
