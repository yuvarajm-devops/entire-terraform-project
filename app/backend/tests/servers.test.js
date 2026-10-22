const request = require('supertest');
const app = require('../src/app');

describe('Server Inventory API', () => {
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

  it('GET /api/servers should list monitored servers', async () => {
    const res = await request(app)
      .get('/api/servers')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /api/servers should register a new server and issue an agent key', async () => {
    const res = await request(app)
      .post('/api/servers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        hostname: 'test-node-01.dev.internal',
        displayName: 'Test CI Runner',
        ipAddress: '10.20.3.50',
        cpuCores: 2,
        totalMemoryMb: 4096,
        totalDiskGb: 60.0
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.agent_key).toBeDefined();
    expect(res.body.data.hostname).toEqual('test-node-01.dev.internal');
  });
});
