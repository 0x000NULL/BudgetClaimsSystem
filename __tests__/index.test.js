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

describe('Index Routes', () => {
  it('should load the home page', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('Welcome to Budget Claims System');
  });

  it('should load the login page', async () => {
    const res = await request(app).get('/login');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('Login');
  });

  it('should load the register page', async () => {
    const res = await request(app).get('/register');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('Register');
  });
});
