const request = require('supertest');
const app = require('../server');
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

describe('Security Tests', () => {
  it('should prevent SQL injection', async () => {
    const res = await request(app)
      .get('/claims?mva=1; DROP TABLE users;');
    expect(res.statusCode).toEqual(400);
  });

  it('should prevent XSS', async () => {
    const res = await request(app)
      .post('/claims')
      .send({
        mva: '123456',
        customerName: '<script>alert("XSS")</script>',
        description: 'Test Claim'
      });
    expect(res.statusCode).toEqual(400);
  });
});
