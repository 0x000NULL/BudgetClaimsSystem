const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // Ensure you export your express app in server.js
const Claim = require('../models/Claim');

let server;

beforeAll(async () => {
  await mongoose.connect(global.__MONGO_URI__, { useNewUrlParser: true, useUnifiedTopology: true });
  server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
  server.close();
});

describe('Claims API', () => {
  let claimId;

  it('should create a new claim', async () => {
    const response = await request(app)
      .post('/claims')
      .send({
        mva: '100000',
        customerName: 'John Doe',
        description: 'Test claim description',
        status: 'Open'
      });
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('_id');
    claimId = response.body._id;
  });

  it('should get all claims', async () => {
    const response = await request(app).get('/claims');
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
  });

  it('should get a single claim by ID', async () => {
    const response = await request(app).get(`/claims/${claimId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('_id', claimId);
  });

  it('should update a claim by ID', async () => {
    const response = await request(app)
      .put(`/claims/${claimId}`)
      .send({
        description: 'Updated claim description'
      });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('description', 'Updated claim description');
  });

  it('should delete a claim by ID', async () => {
    const response = await request(app).delete(`/claims/${claimId}`);
    expect(response.statusCode).toBe(200);
    const getResponse = await request(app).get(`/claims/${claimId}`);
    expect(getResponse.statusCode).toBe(404);
  });
});
