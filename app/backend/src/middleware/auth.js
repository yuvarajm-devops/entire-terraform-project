const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

/**
 * Verifies JWT token and sets req.user and req.tenantId.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token required'
    });
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    req.user = user;
    req.tenantId = user.tenant_id || '00000000-0000-0000-0000-000000000001';
    next();
  });
}

/**
 * Role-based authorization guard.
 * @param  {...string} roles Allowed roles ('admin', 'operator', 'viewer')
 */
function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: ${roles.join(', ')}`
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRoles
};
