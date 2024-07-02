const request = require('supertest');
const app = require('../server');
const Claim = require('../models/Claim');

describe('Claims Routes', () => {
  it('should create a new claim', async () => {
    const res = await request(app)
      .post('/claims')
      .send({
        mva: '100',
        customerName: 'John Doe',
        status: 'Open'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
  });

  it('should get a list of claims', async () => {
    await Claim.create({
      mva: '100',
      customerName: 'John Doe',
      status: 'Open'
    });

    const res = await request(app).get('/claims');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get a single claim by ID', async () => {
    const claim = await Claim.create({
      mva: '100',
      customerName: 'John Doe',
      status: 'Open'
    });

    const res = await request(app).get(`/claims/${claim._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('_id', claim._id.toString());
  });

  it('should update a claim', async () => {
    const claim = await Claim.create({
      mva: '100',
      customerName: 'John Doe',
      status: 'Open'
    });

    const res = await request(app)
      .put(`/claims/${claim._id}`)
      .send({ status: 'Closed' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'Closed');
  });

  it('should delete a claim', async () => {
    const claim = await Claim.create({
      mva: '100',
      customerName: 'John Doe',
      status: 'Open'
    });

    const res = await request(app).delete(`/claims/${claim._id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('msg', 'Claim deleted');
  });
});
