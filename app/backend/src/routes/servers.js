const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken, requireRoles } = require('../middleware/auth');

router.use(authenticateToken);

/**
 * GET /api/servers
 */
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;

    if (db.isPostgres()) {
      let query = 'SELECT * FROM servers WHERE tenant_id = $1';
      const params = [req.tenantId];

      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }

      if (search) {
        params.push(`%${search}%`);
        query += ` AND (hostname ILIKE $${params.length} OR display_name ILIKE $${params.length} OR ip_address ILIKE $${params.length})`;
      }

      query += ' ORDER BY created_at DESC';
      const result = await db.query(query, params);
      return res.json({ success: true, data: result.rows });
    } else {
      let list = db.memory.servers.filter(s => s.tenant_id === req.tenantId);

      if (status) {
        list = list.filter(s => s.status === status);
      }

      if (search) {
        const q = search.toLowerCase();
        list = list.filter(
          s => s.hostname.toLowerCase().includes(q) ||
               (s.display_name && s.display_name.toLowerCase().includes(q)) ||
               s.ip_address.includes(q)
        );
      }

      return res.json({ success: true, data: list });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/servers
 */
router.post('/', requireRoles('admin', 'operator'), async (req, res) => {
  const { hostname, displayName, ipAddress, osName, cpuCores, totalMemoryMb, totalDiskGb } = req.body;

  if (!hostname || !ipAddress) {
    return res.status(400).json({
      success: false,
      error: 'hostname and ipAddress are required'
    });
  }

  const serverId = uuidv4();
  const agentKey = `ak_${crypto.randomBytes(24).toString('hex')}`;

  try {
    const newServer = {
      id: serverId,
      tenant_id: req.tenantId,
      hostname,
      display_name: displayName || hostname,
      ip_address: ipAddress,
      os_name: osName || 'Linux',
      os_version: 'Unknown',
      cpu_cores: parseInt(cpuCores || '2', 10),
      total_memory_mb: parseInt(totalMemoryMb || '4096', 10),
      total_disk_gb: parseFloat(totalDiskGb || '50.0'),
      agent_key: agentKey,
      agent_version: '1.0.0',
      status: 'offline',
      last_heartbeat: null,
      uptime_seconds: 0,
      created_at: new Date(),
      updated_at: new Date()
    };

    if (db.isPostgres()) {
      await db.query(
        `INSERT INTO servers (id, tenant_id, hostname, display_name, ip_address, os_name, cpu_cores, total_memory_mb, total_disk_gb, agent_key, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'offline', NOW(), NOW())`,
        [serverId, req.tenantId, hostname, newServer.display_name, ipAddress, newServer.os_name, newServer.cpu_cores, newServer.total_memory_mb, newServer.total_disk_gb, agentKey]
      );
    } else {
      db.memory.servers.unshift(newServer);
    }

    return res.status(201).json({
      success: true,
      data: newServer,
      message: 'Server registered. Install agent using the provided agentKey.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/servers/:id
 */
router.get('/:id', async (req, res) => {
  try {
    if (db.isPostgres()) {
      const result = await db.query(
        'SELECT * FROM servers WHERE id = $1 AND tenant_id = $2 LIMIT 1',
        [req.params.id, req.tenantId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Server not found' });
      }
      return res.json({ success: true, data: result.rows[0] });
    } else {
      const server = db.memory.servers.find(s => s.id === req.params.id && s.tenant_id === req.tenantId);
      if (!server) {
        return res.status(404).json({ success: false, error: 'Server not found' });
      }
      return res.json({ success: true, data: server });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/servers/:id
 */
router.delete('/:id', requireRoles('admin'), async (req, res) => {
  try {
    if (db.isPostgres()) {
      const result = await db.query(
        'DELETE FROM servers WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [req.params.id, req.tenantId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Server not found' });
      }
    } else {
      const index = db.memory.servers.findIndex(s => s.id === req.params.id && s.tenant_id === req.tenantId);
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Server not found' });
      }
      db.memory.servers.splice(index, 1);
      db.memory.metrics = db.memory.metrics.filter(m => m.server_id !== req.params.id);
      db.memory.alerts = db.memory.alerts.filter(a => a.server_id !== req.params.id);
      db.memory.system_logs = db.memory.system_logs.filter(l => l.server_id !== req.params.id);
    }

    return res.json({ success: true, message: 'Server removed successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/servers/:id/regenerate-key
 */
router.post('/:id/regenerate-key', requireRoles('admin'), async (req, res) => {
  const newKey = `ak_${crypto.randomBytes(24).toString('hex')}`;

  try {
    if (db.isPostgres()) {
      const result = await db.query(
        'UPDATE servers SET agent_key = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING agent_key',
        [newKey, req.params.id, req.tenantId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Server not found' });
      }
    } else {
      const server = db.memory.servers.find(s => s.id === req.params.id && s.tenant_id === req.tenantId);
      if (!server) {
        return res.status(404).json({ success: false, error: 'Server not found' });
      }
      server.agent_key = newKey;
      server.updated_at = new Date();
    }

    return res.json({ success: true, data: { agentKey: newKey } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
