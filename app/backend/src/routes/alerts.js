const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRoles } = require('../middleware/auth');

router.use(authenticateToken);

/**
 * GET /api/alerts
 */
router.get('/', async (req, res) => {
  const { status, severity, serverId, limit = '100' } = req.query;
  const maxLimit = Math.min(parseInt(limit, 10) || 100, 200);

  try {
    if (db.isPostgres()) {
      let query = `
        SELECT a.*, s.hostname, s.display_name, s.ip_address, r.name as rule_name
        FROM alerts a
        JOIN servers s ON s.id = a.server_id
        LEFT JOIN alert_rules r ON r.id = a.rule_id
        WHERE a.tenant_id = $1
      `;
      const params = [req.tenantId];

      if (serverId) {
        params.push(serverId);
        query += ` AND a.server_id = $${params.length}`;
      }

      if (status && status !== 'all') {
        params.push(status);
        query += ` AND a.status = $${params.length}`;
      }

      if (severity && severity !== 'all') {
        params.push(severity);
        query += ` AND a.severity = $${params.length}`;
      }

      params.push(maxLimit);
      query += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;

      const result = await db.query(query, params);
      return res.json({ success: true, data: result.rows });
    } else {
      let list = db.memory.alerts
        .filter(a => a.tenant_id === req.tenantId)
        .map(a => {
          const s = db.memory.servers.find(srv => srv.id === a.server_id);
          const r = db.memory.alert_rules.find(rul => rul.id === a.rule_id);
          return {
            ...a,
            hostname: s ? s.hostname : 'Unknown',
            display_name: s ? (s.display_name || s.hostname) : 'Unknown',
            ip_address: s ? s.ip_address : '0.0.0.0',
            rule_name: r ? r.name : 'System Alert'
          };
        });

      if (serverId) {
        list = list.filter(a => a.server_id === serverId);
      }

      if (status && status !== 'all') {
        list = list.filter(a => a.status === status);
      }

      if (severity && severity !== 'all') {
        list = list.filter(a => a.severity === severity);
      }

      return res.json({ success: true, data: list.slice(0, maxLimit) });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/alerts/:id/acknowledge
 */
router.post('/:id/acknowledge', requireRoles('admin', 'operator'), async (req, res) => {
  try {
    if (db.isPostgres()) {
      const result = await db.query(
        `UPDATE alerts SET status = 'acknowledged', acknowledged_at = NOW()
         WHERE id = $1 AND tenant_id = $2 RETURNING *`,
        [req.params.id, req.tenantId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Alert incident not found' });
      }
      return res.json({ success: true, data: result.rows[0] });
    } else {
      const alert = db.memory.alerts.find(a => a.id === req.params.id && a.tenant_id === req.tenantId);
      if (!alert) {
        return res.status(404).json({ success: false, error: 'Alert incident not found' });
      }
      alert.status = 'acknowledged';
      alert.acknowledged_at = new Date();
      return res.json({ success: true, data: alert });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/alerts/:id/resolve
 */
router.post('/:id/resolve', requireRoles('admin', 'operator'), async (req, res) => {
  try {
    if (db.isPostgres()) {
      const result = await db.query(
        `UPDATE alerts SET status = 'resolved', resolved_at = NOW()
         WHERE id = $1 AND tenant_id = $2 RETURNING *`,
        [req.params.id, req.tenantId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Alert incident not found' });
      }
      return res.json({ success: true, data: result.rows[0] });
    } else {
      const alert = db.memory.alerts.find(a => a.id === req.params.id && a.tenant_id === req.tenantId);
      if (!alert) {
        return res.status(404).json({ success: false, error: 'Alert incident not found' });
      }
      alert.status = 'resolved';
      alert.resolved_at = new Date();
      return res.json({ success: true, data: alert });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
