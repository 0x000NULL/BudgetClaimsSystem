const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
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

describe('Integration Tests', () => {
  it('should create a user, login, create a claim, and view the claim', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });

    const agent = request.agent(app);
    await agent
      .post('/users/login')
      .send({ email: user.email, password: 'password123' });

    const claimRes = await agent
      .post('/claims')
      .send({
        mva: '123456',
        customerName: 'John Doe',
        description: 'Test Claim'
      });
    expect(claimRes.statusCode).toEqual(201);
    const claimId = claimRes.body._id;

    const viewRes = await agent.get(`/claims/${claimId}`);
    expect(viewRes.statusCode).toEqual(200);
    expect(viewRes.body).toHaveProperty('mva', '123456');
  });
});
