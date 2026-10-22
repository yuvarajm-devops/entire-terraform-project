const request = require('supertest');
const app = require('../src/app');

describe('Alerts API', () => {
  let authToken = '';

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@monitoring.local',
        password: 'AdminPassword123!'
      });
    authToken = loginRes.body.data.token;
  });

  it('GET /api/alerts should list alerts for tenant', async () => {
    const res = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/alerts should filter by serverId', async () => {
    const targetServerId = '33333333-3333-3333-3333-333333333333';
    const res = await request(app)
      .get(`/api/alerts?serverId=${targetServerId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    res.body.data.forEach(alert => {
      expect(alert.server_id).toEqual(targetServerId);
    });
  });
});
