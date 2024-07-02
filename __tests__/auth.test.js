const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
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

describe('Authentication and Authorization', () => {
  it('should redirect unauthenticated users to login', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.statusCode).toEqual(302);
    expect(res.headers.location).toEqual('/login');
  });

  it('should allow authenticated users to access dashboard', async () => {
    const user = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin'
    });

    const agent = request.agent(app);
    await agent
      .post('/users/login')
      .send({ email: user.email, password: 'password123' });

    const res = await agent.get('/dashboard');
    expect(res.statusCode).toEqual(200);
  });

  it('should restrict access based on user roles', async () => {
    const user = await User.create({
      name: 'Manager User',
      email: 'manager@example.com',
      password: 'password123',
      role: 'manager'
    });

    const agent = request.agent(app);
    await agent
      .post('/users/login')
      .send({ email: user.email, password: 'password123' });

    const res = await agent.get('/admin-only-route');
    expect(res.statusCode).toEqual(403);
  });
});
