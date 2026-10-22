const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  try {
    let user = null;

    if (db.isPostgres()) {
      const result = await db.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase().trim()]);
      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    } else {
      user = db.memory.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        fullName: user.full_name,
        role: user.role,
        tenant_id: user.tenant_id,
        tenantId: user.tenant_id
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          tenantId: user.tenant_id
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Login failure: ' + err.message
    });
  }
});

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  const { email, password, fullName, tenantName } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({
      success: false,
      error: 'Email, password, and full name are required'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters'
    });
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = uuidv4();
    const tenantId = uuidv4();
    const tenantSlug = `${(tenantName || 'default').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${userId.substring(0, 8)}`;

    if (db.isPostgres()) {
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'User with this email already exists' });
      }

      await db.query(
        'INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3)',
        [tenantId, tenantName || 'Default Organization', tenantSlug]
      );

      await db.query(
        `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4, $5, 'admin')`,
        [userId, tenantId, email.toLowerCase(), passwordHash, fullName]
      );
    } else {
      const exists = db.memory.users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        return res.status(409).json({ success: false, error: 'User with this email already exists' });
      }

      db.memory.tenants.push({
        id: tenantId,
        name: tenantName || 'Default Organization',
        slug: tenantSlug,
        created_at: new Date()
      });

      db.memory.users.push({
        id: userId,
        tenant_id: tenantId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName,
        role: 'admin',
        is_active: true,
        created_at: new Date()
      });
    }

    const token = jwt.sign(
      {
        id: userId,
        email: email.toLowerCase(),
        full_name: fullName,
        fullName,
        role: 'admin',
        tenant_id: tenantId,
        tenantId
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          email: email.toLowerCase(),
          fullName,
          role: 'admin',
          tenantId
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Registration failed: ' + err.message
    });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    data: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName || req.user.full_name,
      full_name: req.user.full_name || req.user.fullName,
      role: req.user.role,
      tenantId: req.user.tenantId || req.user.tenant_id,
      tenant_id: req.user.tenant_id || req.user.tenantId
    }
  });
});

module.exports = router;
