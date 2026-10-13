const request = require('supertest');
const app = require('../app');

describe('API Smoke Tests', () => {
  it('GET /api/v1 should return API status', async () => {
    const res = await request(app).get('/api/v1');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'online');
    expect(res.body).toHaveProperty('endpoints');
  });

  it('GET /unknown-endpoint should return 404', async () => {
    const res = await request(app).get('/unknown-endpoint');
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('error', 'Endpoint not found');
  });
});
