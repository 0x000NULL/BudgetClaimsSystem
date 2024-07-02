const request = require('supertest');
const app = require('../server');
const AuditLog = require('../models/AuditLog');

describe('Audit Logs Routes', () => {
  it('should create a new audit log', async () => {
    const res = await request(app)
      .post('/audit-logs')
      .send({
        user: 'testUser',
        action: 'Test Action',
        details: 'Test Details'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
  });

  it('should get a list of audit logs', async () => {
    await AuditLog.create({
      user: 'testUser',
      action: 'Test Action',
      details: 'Test Details'
    });

    const res = await request(app).get('/audit-logs');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
