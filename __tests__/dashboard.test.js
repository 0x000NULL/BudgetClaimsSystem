const request = require('supertest');
const app = require('../server');
const Claim = require('../models/Claim');

describe('Dashboard Routes', () => {
  it('should fetch dashboard statistics', async () => {
    await Claim.create({
      mva: '100',
      customerName: 'John Doe',
      status: 'Open'
    });

    const res = await request(app).get('/dashboard');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('totalClaims');
    expect(res.body).toHaveProperty('openClaims');
    expect(res.body).toHaveProperty('inProgressClaims');
    expect(res.body).toHaveProperty('closedClaims');
  });
});
