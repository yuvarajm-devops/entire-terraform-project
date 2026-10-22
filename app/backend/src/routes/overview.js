const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

/**
 * GET /api/overview
 * High-level fleet metrics and incident summary for the dashboard.
 */
router.get('/', async (req, res) => {
  try {
    if (db.isPostgres()) {
      // Servers counts
      const srvResult = await db.query(
        `SELECT 
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'online') as online,
           COUNT(*) FILTER (WHERE status = 'offline') as offline,
           COUNT(*) FILTER (WHERE status = 'warning') as warning,
           AVG(uptime_seconds) as avg_uptime
         FROM servers WHERE tenant_id = $1`,
        [req.tenantId]
      );

      // Latest metrics per server
      const metricAvg = await db.query(
        `SELECT 
           AVG(m.cpu_percent) as avg_cpu,
           AVG(m.memory_percent) as avg_mem,
           AVG(m.disk_percent) as avg_disk
         FROM (
           SELECT DISTINCT ON (server_id) server_id, cpu_percent, memory_percent, disk_percent
           FROM metrics
           ORDER BY server_id, timestamp DESC
         ) m
         JOIN servers s ON s.id = m.server_id
         WHERE s.tenant_id = $1`,
        [req.tenantId]
      );

      // Recent alerts
      const alerts = await db.query(
        `SELECT a.*, s.hostname 
         FROM alerts a
         JOIN servers s ON s.id = a.server_id
         WHERE a.tenant_id = $1 AND a.status IN ('active', 'acknowledged')
         ORDER BY a.created_at DESC LIMIT 5`,
        [req.tenantId]
      );

      // Recent critical / warn logs
      const logs = await db.query(
        `SELECT l.*, s.hostname 
         FROM system_logs l
         JOIN servers s ON s.id = l.server_id
         WHERE s.tenant_id = $1 AND l.level IN ('WARN', 'ERROR', 'CRITICAL')
         ORDER BY l.timestamp DESC LIMIT 5`,
        [req.tenantId]
      );

      const srvStats = srvResult.rows[0];
      const mStats = metricAvg.rows[0];

      return res.json({
        success: true,
        data: {
          totalServers: parseInt(srvStats.total || '0', 10),
          onlineServers: parseInt(srvStats.online || '0', 10),
          offlineServers: parseInt(srvStats.offline || '0', 10),
          warningServers: parseInt(srvStats.warning || '0', 10),
          averageUptimeHours: Math.round((parseFloat(srvStats.avg_uptime || '0') / 3600) * 10) / 10,
          averageCpu: Math.round(parseFloat(mStats.avg_cpu || '0') * 10) / 10,
          averageMemory: Math.round(parseFloat(mStats.avg_mem || '0') * 10) / 10,
          averageDisk: Math.round(parseFloat(mStats.avg_disk || '0') * 10) / 10,
          activeAlertsCount: alerts.rows.length,
          recentAlerts: alerts.rows,
          recentLogs: logs.rows
        }
      });
    } else {
      const servers = db.memory.servers.filter(s => s.tenant_id === req.tenantId);
      const total = servers.length;
      const online = servers.filter(s => s.status === 'online').length;
      const offline = servers.filter(s => s.status === 'offline').length;
      const warning = servers.filter(s => s.status === 'warning').length;

      const totalUptime = servers.reduce((acc, s) => acc + (s.uptime_seconds || 0), 0);
      const avgUptimeHours = total > 0 ? Math.round((totalUptime / total / 3600) * 10) / 10 : 0;

      // Calculate averages from latest metrics of online servers
      let cpuSum = 0;
      let memSum = 0;
      let diskSum = 0;
      let count = 0;

      for (const s of servers) {
        const serverMetrics = db.memory.metrics.filter(m => m.server_id === s.id);
        if (serverMetrics.length > 0) {
          const latest = serverMetrics[serverMetrics.length - 1];
          cpuSum += latest.cpu_percent;
          memSum += latest.memory_percent;
          diskSum += latest.disk_percent;
          count++;
        }
      }

      const activeAlerts = db.memory.alerts
        .filter(a => a.tenant_id === req.tenantId && ['active', 'acknowledged'].includes(a.status))
        .map(a => {
          const s = db.memory.servers.find(srv => srv.id === a.server_id);
          return { ...a, hostname: s ? s.hostname : 'Unknown' };
        });

      const recentLogs = db.memory.system_logs
        .filter(l => ['WARN', 'ERROR', 'CRITICAL'].includes(l.level))
        .map(l => {
          const s = db.memory.servers.find(srv => srv.id === l.server_id);
          return { ...l, hostname: s ? s.hostname : 'Unknown' };
        })
        .slice(0, 5);

      return res.json({
        success: true,
        data: {
          totalServers: total,
          onlineServers: online,
          offlineServers: offline,
          warningServers: warning,
          averageUptimeHours: avgUptimeHours,
          averageCpu: count > 0 ? Math.round((cpuSum / count) * 10) / 10 : 0,
          averageMemory: count > 0 ? Math.round((memSum / count) * 10) / 10 : 0,
          averageDisk: count > 0 ? Math.round((diskSum / count) * 10) / 10 : 0,
          activeAlertsCount: activeAlerts.length,
          recentAlerts: activeAlerts.slice(0, 5),
          recentLogs
        }
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
