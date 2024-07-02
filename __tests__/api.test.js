const request = require('supertest');
const app = require('../server');

describe('API Routes', () => {
  it('should respond with a status 200 for GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'OK');
  });
});
