const request = require('supertest');
const app = require('../server');
const Customer = require('../models/Customer');

describe('Customers Routes', () => {
  it('should create a new customer', async () => {
    const res = await request(app)
      .post('/customer')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
  });

  it('should get a list of customers', async () => {
    await Customer.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890'
    });

    const res = await request(app).get('/customer');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get a single customer by ID', async () => {
    const customer = await Customer.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890'
    });

    const res = await request(app).get(`/customer/${customer._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('_id', customer._id.toString());
  });

  it('should update a customer', async () => {
    const customer = await Customer.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890'
    });

    const res = await request(app)
      .put(`/customer/${customer._id}`)
      .send({ phone: '0987654321' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('phone', '0987654321');
  });

  it('should delete a customer', async () => {
    const customer = await Customer.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890'
    });

    const res = await request(app).delete(`/customer/${customer._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('msg', 'Customer deleted');
  });
});
