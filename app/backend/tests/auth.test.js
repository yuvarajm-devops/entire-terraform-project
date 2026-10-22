const request = require('supertest');
const app = require('../src/app');

describe('Authentication API', () => {
  it('POST /api/auth/login should authenticate with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@monitoring.local',
        password: 'AdminPassword123!'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toEqual('admin@monitoring.local');
  });

  it('POST /api/auth/login should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@monitoring.local',
        password: 'wrong-password'
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me should return user details with valid token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@monitoring.local',
        password: 'AdminPassword123!'
      });

    const token = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.statusCode).toEqual(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.email).toEqual('admin@monitoring.local');
  });
});
