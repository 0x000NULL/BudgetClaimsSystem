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
