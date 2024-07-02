const request = require('supertest');
const app = require('../server');

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
