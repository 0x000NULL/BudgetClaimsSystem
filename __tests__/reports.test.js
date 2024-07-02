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

describe('Reports Routes', () => {
  it('should generate a CSV report', async () => {
    const res = await request(app)
      .post('/reports/generate')
      .send({
        format: 'csv',
        claimIds: []
      });
    expect(res.statusCode).toEqual(200);
    expect(res.header['content-type']).toEqual(expect.stringContaining('text/csv'));
  });

  it('should generate an Excel report', async () => {
    const res = await request(app)
      .post('/reports/generate')
      .send({
        format: 'excel',
        claimIds: []
      });
    expect(res.statusCode).toEqual(200);
    expect(res.header['content-type']).toEqual(expect.stringContaining('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
  });

  it('should generate a PDF report', async () => {
    const res = await request(app)
      .post('/reports/generate')
      .send({
        format: 'pdf',
        claimIds: []
      });
    expect(res.statusCode).toEqual(200);
    expect(res.header['content-type']).toEqual(expect.stringContaining('application/pdf'));
  });
});
