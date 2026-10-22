const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateAgent } = require('../middleware/agentAuth');
const { authenticateToken } = require('../middleware/auth');
const { evaluateMetrics } = require('../services/alertEvaluator');

/**
 * POST /api/metrics/ingest
 * Ingestion endpoint for the Python monitoring agent.
 */
router.post('/ingest', authenticateAgent, async (req, res) => {
  const server = req.server;
  const {
    cpu_percent,
    memory_used_mb,
    memory_total_mb,
    memory_percent,
    swap_percent,
    disk_used_gb,
    disk_total_gb,
    disk_percent,
    load_1m,
    load_5m,
    load_15m,
    network_rx_kbps,
    network_tx_kbps,
    uptime_seconds,
    os_name,
    os_version,
    cpu_cores,
    agent_version
  } = req.body;

  if (cpu_percent === undefined || memory_percent === undefined || disk_percent === undefined) {
    return res.status(400).json({
      success: false,
      error: 'cpu_percent, memory_percent, and disk_percent are required'
    });
  }

  const now = new Date();

  try {
    const metricRecord = {
      server_id: server.id,
      cpu_percent: parseFloat(cpu_percent),
      memory_used_mb: parseInt(memory_used_mb || '0', 10),
      memory_total_mb: parseInt(memory_total_mb || '0', 10),
      memory_percent: parseFloat(memory_percent),
      swap_percent: parseFloat(swap_percent || '0'),
      disk_used_gb: parseFloat(disk_used_gb || '0'),
      disk_total_gb: parseFloat(disk_total_gb || '0'),
      disk_percent: parseFloat(disk_percent),
      load_1m: parseFloat(load_1m || '0'),
      load_5m: parseFloat(load_5m || '0'),
      load_15m: parseFloat(load_15m || '0'),
      network_rx_kbps: parseFloat(network_rx_kbps || '0'),
      network_tx_kbps: parseFloat(network_tx_kbps || '0'),
      timestamp: now
    };

    if (db.isPostgres()) {
      await db.query(
        `INSERT INTO metrics (
          server_id, cpu_percent, memory_used_mb, memory_total_mb, memory_percent,
          swap_percent, disk_used_gb, disk_total_gb, disk_percent,
          load_1m, load_5m, load_15m, network_rx_kbps, network_tx_kbps, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          metricRecord.server_id,
          metricRecord.cpu_percent,
          metricRecord.memory_used_mb,
          metricRecord.memory_total_mb,
          metricRecord.memory_percent,
          metricRecord.swap_percent,
          metricRecord.disk_used_gb,
          metricRecord.disk_total_gb,
          metricRecord.disk_percent,
          metricRecord.load_1m,
          metricRecord.load_5m,
          metricRecord.load_15m,
          metricRecord.network_rx_kbps,
          metricRecord.network_tx_kbps,
          now
        ]
      );

      // Update server state & specs
      await db.query(
        `UPDATE servers 
         SET status = 'online', last_heartbeat = $1, uptime_seconds = $2,
             os_name = COALESCE($3, os_name), os_version = COALESCE($4, os_version),
             cpu_cores = COALESCE($5, cpu_cores), agent_version = COALESCE($6, agent_version),
             updated_at = NOW()
         WHERE id = $7`,
        [now, uptime_seconds || 0, os_name, os_version, cpu_cores, agent_version, server.id]
      );
    } else {
      metricRecord.id = db.memory.metrics.length + 1;
      db.memory.metrics.push(metricRecord);

      // Keep last 1000 metrics in memory
      if (db.memory.metrics.length > 2000) {
        db.memory.metrics.splice(0, db.memory.metrics.length - 1000);
      }

      // Update server state
      server.status = 'online';
      server.last_heartbeat = now;
      if (uptime_seconds) server.uptime_seconds = uptime_seconds;
      if (os_name) server.os_name = os_name;
      if (os_version) server.os_version = os_version;
      if (cpu_cores) server.cpu_cores = cpu_cores;
      if (agent_version) server.agent_version = agent_version;
      server.updated_at = now;
    }

    // Trigger alert rule evaluation
    await evaluateMetrics(server, metricRecord);

    return res.status(200).json({
      success: true,
      message: 'Metrics ingested successfully',
      serverStatus: 'online',
      timestamp: now.toISOString()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/metrics/heartbeat
 * Lightweight ping endpoint
 */
router.post('/heartbeat', authenticateAgent, async (req, res) => {
  const server = req.server;
  const now = new Date();

  try {
    if (db.isPostgres()) {
      await db.query(
        `UPDATE servers SET status = 'online', last_heartbeat = $1, updated_at = NOW() WHERE id = $2`,
        [now, server.id]
      );
    } else {
      server.status = 'online';
      server.last_heartbeat = now;
      server.updated_at = now;
    }

    return res.json({ success: true, status: 'online', timestamp: now.toISOString() });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/metrics/:serverId/latest
 */
router.get('/:serverId/latest', authenticateToken, async (req, res) => {
  try {
    if (db.isPostgres()) {
      const result = await db.query(
        `SELECT m.* FROM metrics m
         JOIN servers s ON s.id = m.server_id
         WHERE m.server_id = $1 AND s.tenant_id = $2
         ORDER BY m.timestamp DESC LIMIT 1`,
        [req.params.serverId, req.tenantId]
      );

      return res.json({ success: true, data: result.rows[0] || null });
    } else {
      const server = db.memory.servers.find(s => s.id === req.params.serverId && s.tenant_id === req.tenantId);
      if (!server) {
        return res.status(404).json({ success: false, error: 'Server not found' });
      }

      const list = db.memory.metrics.filter(m => m.server_id === req.params.serverId);
      const latest = list.length > 0 ? list[list.length - 1] : null;

      return res.json({ success: true, data: latest });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/metrics/:serverId/history
 */
router.get('/:serverId/history', authenticateToken, async (req, res) => {
  const { range = '1h' } = req.query;

  let durationMinutes = 60;
  if (range === '6h') durationMinutes = 360;
  if (range === '24h') durationMinutes = 1440;
  if (range === '7d') durationMinutes = 10080;

  const since = new Date(Date.now() - durationMinutes * 60 * 1000);

  try {
    if (db.isPostgres()) {
      const result = await db.query(
        `SELECT m.* FROM metrics m
         JOIN servers s ON s.id = m.server_id
         WHERE m.server_id = $1 AND s.tenant_id = $2 AND m.timestamp >= $3
         ORDER BY m.timestamp ASC`,
        [req.params.serverId, req.tenantId, since]
      );

      return res.json({
        success: true,
        data: {
          serverId: req.params.serverId,
          range,
          dataPoints: result.rows
        }
      });
    } else {
      const server = db.memory.servers.find(s => s.id === req.params.serverId && s.tenant_id === req.tenantId);
      if (!server) {
        return res.status(404).json({ success: false, error: 'Server not found' });
      }

      const points = db.memory.metrics
        .filter(m => m.server_id === req.params.serverId && new Date(m.timestamp) >= since)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      return res.json({
        success: true,
        data: {
          serverId: req.params.serverId,
          range,
          dataPoints: points
        }
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
