const { v4: uuidv4 } = require('uuid');
const db = require('../db');

/**
 * Evaluates metric values against configured tenant alert rules with deduplication.
 */
async function evaluateMetrics(server, metrics) {
  try {
    let rules = [];
    if (db.isPostgres()) {
      const res = await db.query(
        'SELECT * FROM alert_rules WHERE tenant_id = $1 AND is_enabled = true',
        [server.tenant_id]
      );
      rules = res.rows;
    } else {
      rules = db.memory.alert_rules.filter(
        r => r.tenant_id === server.tenant_id && r.is_enabled
      );
    }

    for (const rule of rules) {
      let currentValue = null;
      let title = '';

      switch (rule.metric_type) {
        case 'cpu':
          currentValue = parseFloat(metrics.cpu_percent);
          title = `High CPU Utilization on ${server.hostname}`;
          break;
        case 'memory':
          currentValue = parseFloat(metrics.memory_percent);
          title = `High Memory Usage on ${server.hostname}`;
          break;
        case 'disk':
          currentValue = parseFloat(metrics.disk_percent);
          title = `Disk Space Warning on ${server.hostname}`;
          break;
        case 'load':
          currentValue = parseFloat(metrics.load_1m || metrics.load_5m || 0);
          title = `Elevated System Load on ${server.hostname}`;
          break;
        default:
          break;
      }

      if (currentValue === null || isNaN(currentValue)) continue;

      let triggered = false;
      const thresh = parseFloat(rule.threshold_value);

      switch (rule.condition_operator) {
        case '>':
          triggered = currentValue > thresh;
          break;
        case '>=':
          triggered = currentValue >= thresh;
          break;
        case '<':
          triggered = currentValue < thresh;
          break;
        case '<=':
          triggered = currentValue <= thresh;
          break;
        case '==':
          triggered = Math.abs(currentValue - thresh) < 0.01;
          break;
      }

      if (triggered) {
        await triggerAlert(server, rule, title, currentValue, thresh);
      } else {
        await resolveAlert(server, rule);
      }
    }
  } catch (err) {
    console.error('Error evaluating alert rules:', err.message);
  }
}

async function triggerAlert(server, rule, title, currentValue, thresholdValue) {
  const message = `${rule.name}: ${rule.metric_type} is ${currentValue}% (Threshold: ${rule.condition_operator} ${thresholdValue}%)`;

  if (db.isPostgres()) {
    // Check for existing active alert (deduplication)
    const existing = await db.query(
      `SELECT id FROM alerts 
       WHERE server_id = $1 AND rule_id = $2 AND status = 'active' LIMIT 1`,
      [server.id, rule.id]
    );

    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO alerts (id, tenant_id, rule_id, server_id, title, message, severity, current_value, threshold_value, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW())`,
        [uuidv4(), server.tenant_id, rule.id, server.id, title, message, rule.severity, currentValue, thresholdValue]
      );
    } else {
      // Update current metric reading
      await db.query(
        `UPDATE alerts SET current_value = $1 WHERE id = $2`,
        [currentValue, existing.rows[0].id]
      );
    }
  } else {
    const existing = db.memory.alerts.find(
      a => a.server_id === server.id && a.rule_id === rule.id && a.status === 'active'
    );

    if (!existing) {
      db.memory.alerts.unshift({
        id: uuidv4(),
        tenant_id: server.tenant_id,
        rule_id: rule.id,
        server_id: server.id,
        title,
        message,
        severity: rule.severity,
        current_value: currentValue,
        threshold_value: thresholdValue,
        status: 'active',
        acknowledged_at: null,
        resolved_at: null,
        created_at: new Date()
      });
    } else {
      existing.current_value = currentValue;
    }
  }
}

async function resolveAlert(server, rule) {
  if (db.isPostgres()) {
    await db.query(
      `UPDATE alerts 
       SET status = 'resolved', resolved_at = NOW() 
       WHERE server_id = $1 AND rule_id = $2 AND status = 'active'`,
      [server.id, rule.id]
    );
  } else {
    const active = db.memory.alerts.find(
      a => a.server_id === server.id && a.rule_id === rule.id && a.status === 'active'
    );
    if (active) {
      active.status = 'resolved';
      active.resolved_at = new Date();
    }
  }
}

module.exports = {
  evaluateMetrics
};
