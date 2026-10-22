const request = require('supertest');
const app = require('../src/app');

describe('Health Check Endpoint', () => {
  it('GET /health should return 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('healthy');
    expect(res.body.service).toEqual('realtime-monitoring-backend');
    expect(res.body.timestamp).toBeDefined();
  });
});
