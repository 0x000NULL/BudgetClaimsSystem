const request = require('supertest');
const app = require('../server');
const Employee = require('../models/Employee');
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

describe('Employees Routes', () => {
  it('should create a new employee', async () => {
    const res = await request(app)
      .post('/employee')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Manager'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
  });

  it('should get a list of employees', async () => {
    await Employee.create({
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Manager'
    });

    const res = await request(app).get('/employee');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get a single employee by ID', async () => {
    const employee = await Employee.create({
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Manager'
    });

    const res = await request(app).get(`/employee/${employee._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('_id', employee._id.toString());
  });

  it('should update an employee', async () => {
    const employee = await Employee.create({
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Manager'
    });

    const res = await request(app)
      .put(`/employee/${employee._id}`)
      .send({ role: 'Admin' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('role', 'Admin');
  });

  it('should delete an employee', async () => {
    const employee = await Employee.create({
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Manager'
    });

    const res = await request(app).delete(`/employee/${employee._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('msg', 'Employee deleted');
  });
});
