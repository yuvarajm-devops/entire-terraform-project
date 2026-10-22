const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const config = require('../config');

let monitorInterval = null;

/**
 * Periodically audits server heartbeat freshness.
 */
function startHeartbeatMonitor() {
  if (monitorInterval) return;

  const thresholdSeconds = config.monitoring.offlineThresholdSeconds;

  monitorInterval = setInterval(async () => {
    try {
      const cutoffTime = new Date(Date.now() - thresholdSeconds * 1000);

      if (db.isPostgres()) {
        // Find newly expired servers
        const expired = await db.query(
          `SELECT * FROM servers 
           WHERE status IN ('online', 'warning') 
             AND (last_heartbeat < $1 OR last_heartbeat IS NULL)`,
          [cutoffTime]
        );

        for (const s of expired.rows) {
          await db.query(`UPDATE servers SET status = 'offline' WHERE id = $1`, [s.id]);

          // Check if active alert already exists
          const existingAlert = await db.query(
            `SELECT id FROM alerts 
             WHERE server_id = $1 AND title LIKE '%Heartbeat Lost%' AND status = 'active'`,
            [s.id]
          );

          if (existingAlert.rows.length === 0) {
            await db.query(
              `INSERT INTO alerts (id, tenant_id, server_id, title, message, severity, status, created_at)
               VALUES ($1, $2, $3, $4, $5, 'critical', 'active', NOW())`,
              [
                uuidv4(),
                s.tenant_id,
                s.id,
                `Server Heartbeat Lost: ${s.hostname}`,
                `Server ${s.hostname} (${s.ip_address}) missed heartbeats for over ${thresholdSeconds} seconds.`
              ]
            );
          }
        }
      } else {
        // Memory fallback
        for (const s of db.memory.servers) {
          if (['online', 'warning'].includes(s.status)) {
            const lastHb = s.last_heartbeat ? new Date(s.last_heartbeat).getTime() : 0;
            if (Date.now() - lastHb > thresholdSeconds * 1000) {
              s.status = 'offline';

              const hasAlert = db.memory.alerts.some(
                a => a.server_id === s.id && a.title.includes('Heartbeat Lost') && a.status === 'active'
              );

              if (!hasAlert) {
                db.memory.alerts.unshift({
                  id: uuidv4(),
                  tenant_id: s.tenant_id,
                  server_id: s.id,
                  rule_id: null,
                  title: `Server Heartbeat Lost: ${s.hostname}`,
                  message: `Server ${s.hostname} (${s.ip_address}) missed heartbeats for over ${thresholdSeconds} seconds.`,
                  severity: 'critical',
                  current_value: 0,
                  threshold_value: 0,
                  status: 'active',
                  acknowledged_at: null,
                  resolved_at: null,
                  created_at: new Date()
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error during heartbeat audit cycle:', err.message);
    }
  }, 15000);

  // Unref so test runner can exit cleanly
  if (monitorInterval.unref) {
    monitorInterval.unref();
  }
}

function stopHeartbeatMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

module.exports = {
  startHeartbeatMonitor,
  stopHeartbeatMonitor
};
