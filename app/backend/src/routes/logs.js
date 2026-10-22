const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateAgent } = require('../middleware/agentAuth');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/logs/ingest
 * Ingestion endpoint for agent system logs.
 */
router.post('/ingest', authenticateAgent, async (req, res) => {
  const server = req.server;
  const { logs } = req.body;

  if (!logs || !Array.isArray(logs)) {
    return res.status(400).json({ success: false, error: 'logs array is required' });
  }

  try {
    const inserted = [];
    const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];

    for (const log of logs) {
      if (!log.message) continue;
      const level = validLevels.includes((log.level || '').toUpperCase()) 
        ? log.level.toUpperCase() 
        : 'INFO';
      const source = (log.source || 'system').slice(0, 100);
      const timestamp = log.timestamp ? new Date(log.timestamp) : new Date();

      if (db.isPostgres()) {
        const result = await db.query(
          `INSERT INTO system_logs (server_id, level, source, message, timestamp)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [server.id, level, source, log.message, timestamp]
        );
        inserted.push(result.rows[0]);
      } else {
        const item = {
          id: db.memory.system_logs.length + 1,
          server_id: server.id,
          level,
          source,
          message: log.message,
          timestamp
        };
        db.memory.system_logs.unshift(item);
        if (db.memory.system_logs.length > 2000) {
          db.memory.system_logs.pop();
        }
        inserted.push(item);
      }
    }

    return res.json({
      success: true,
      message: `Ingested ${inserted.length} log events`,
      count: inserted.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/logs
 */
router.get('/', authenticateToken, async (req, res) => {
  const { serverId, level, search, limit = '100' } = req.query;
  const maxLimit = Math.min(parseInt(limit, 10) || 100, 500);

  try {
    if (db.isPostgres()) {
      let query = `
        SELECT l.*, s.hostname, s.display_name
        FROM system_logs l
        JOIN servers s ON s.id = l.server_id
        WHERE s.tenant_id = $1
      `;
      const params = [req.tenantId];

      if (serverId) {
        params.push(serverId);
        query += ` AND l.server_id = $${params.length}`;
      }

      if (level && level !== 'ALL') {
        params.push(level.toUpperCase());
        query += ` AND l.level = $${params.length}`;
      }

      if (search) {
        params.push(`%${search}%`);
        query += ` AND (l.message ILIKE $${params.length} OR l.source ILIKE $${params.length})`;
      }

      params.push(maxLimit);
      query += ` ORDER BY l.timestamp DESC LIMIT $${params.length}`;

      const result = await db.query(query, params);
      return res.json({ success: true, data: result.rows });
    } else {
      let list = db.memory.system_logs.map(log => {
        const s = db.memory.servers.find(srv => srv.id === log.server_id);
        return {
          ...log,
          hostname: s ? s.hostname : 'Unknown',
          display_name: s ? (s.display_name || s.hostname) : 'Unknown',
          tenant_id: s ? s.tenant_id : null
        };
      }).filter(l => l.tenant_id === req.tenantId);

      if (serverId) {
        list = list.filter(l => l.server_id === serverId);
      }

      if (level && level !== 'ALL') {
        list = list.filter(l => l.level === level.toUpperCase());
      }

      if (search) {
        const q = search.toLowerCase();
        list = list.filter(l => l.message.toLowerCase().includes(q) || l.source.toLowerCase().includes(q));
      }

      return res.json({
        success: true,
        data: list.slice(0, maxLimit)
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
