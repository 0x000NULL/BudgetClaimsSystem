const request = require('supertest');
const app = require('../server');
const User = require('../models/User');

describe('Users Routes', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/users/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        password2: 'password123'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
  });

  it('should log in an existing user', async () => {
    await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    });

    const res = await request(app)
      .post('/users/login')
      .send({
        email: 'john@example.com',
        password: 'password123'
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('msg', 'Login successful');
  });

  it('should log out a user', async () => {
    const res = await request(app).get('/users/logout');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('msg', 'Logout successful');
  });

  it('should get a list of users', async () => {
    await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    });

    const res = await request(app).get('/users');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should delete a user', async () => {
    const user = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    });

    const res = await request(app).delete(`/users/${user._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('msg', 'User deleted');
  });
});
