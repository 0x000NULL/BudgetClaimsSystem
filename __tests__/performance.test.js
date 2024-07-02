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

describe('Performance Tests', () => {
  it('should handle a high number of requests', async () => {
    const requests = [];
    for (let i = 0; i < 100; i++) {
      requests.push(request(app).get('/claims'));
    }

    const responses = await Promise.all(requests);
    responses.forEach(res => {
      expect(res.statusCode).toEqual(200);
    });
  });
});
