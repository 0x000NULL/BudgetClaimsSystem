const request = require('supertest');
const app = require('../server');
const Claim = require('../models/Claim');
const mongoose = require('mongoose');

beforeAll(async () => {
  await mongoose.connect(global.__MONGO_URI__, { useNewUrlParser: true, useUnifiedTopology: true });
  server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Error Handling', () => {
  it('should return 400 for invalid claim creation', async () => {
    const res = await request(app)
      .post('/claims')
      .send({
        mva: '',
        customerName: ''
      });
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should handle non-existent routes gracefully', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.statusCode).toEqual(404);
    expect(res.text).toContain('Page Not Found');
  });

  it('should handle database errors gracefully', async () => {
    jest.spyOn(Claim, 'find').mockImplementation(() => {
      throw new Error('Database Error');
    });

    const res = await request(app).get('/claims');
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty('error', 'Internal Server Error');
  });
});
