const request = require('supertest');
const app = require('../src/app');

describe('Metrics & Ingestion API', () => {
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

  it('POST /api/metrics/ingest should accept valid agent metrics with X-Agent-Key', async () => {
    const res = await request(app)
      .post('/api/metrics/ingest')
      .set('X-Agent-Key', 'agent-key-prod-web-01')
      .send({
        cpu_percent: 42.5,
        memory_used_mb: 4096,
        memory_total_mb: 8192,
        memory_percent: 50.0,
        swap_percent: 1.2,
        disk_used_gb: 30.5,
        disk_total_gb: 80.0,
        disk_percent: 38.1,
        load_1m: 0.85,
        load_5m: 0.90,
        load_15m: 0.75,
        network_rx_kbps: 150.2,
        network_tx_kbps: 420.8,
        uptime_seconds: 432100,
        os_name: 'Linux',
        cpu_cores: 4
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.serverStatus).toEqual('online');
  });

  it('POST /api/metrics/ingest should reject request with invalid agent key', async () => {
    const res = await request(app)
      .post('/api/metrics/ingest')
      .set('X-Agent-Key', 'invalid-agent-key')
      .send({
        cpu_percent: 50,
        memory_percent: 50,
        disk_percent: 50
      });

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/metrics/:serverId/history should return historical points', async () => {
    const serverId = '11111111-1111-1111-1111-111111111111';
    const res = await request(app)
      .get(`/api/metrics/${serverId}/history?range=1h`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.dataPoints)).toBe(true);
  });
});
