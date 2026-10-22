const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken, requireRoles } = require('../middleware/auth');

router.use(authenticateToken);

/**
 * GET /api/alert-rules
 */
router.get('/', async (req, res) => {
  try {
    if (db.isPostgres()) {
      const result = await db.query(
        'SELECT * FROM alert_rules WHERE tenant_id = $1 ORDER BY created_at DESC',
        [req.tenantId]
      );
      return res.json({ success: true, data: result.rows });
    } else {
      const rules = db.memory.alert_rules.filter(r => r.tenant_id === req.tenantId);
      return res.json({ success: true, data: rules });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/alert-rules
 */
router.post('/', requireRoles('admin', 'operator'), async (req, res) => {
  const { name, metricType, conditionOperator, thresholdValue, durationMinutes, severity, isEnabled } = req.body;

  if (!name || !metricType || thresholdValue === undefined) {
    return res.status(400).json({
      success: false,
      error: 'name, metricType, and thresholdValue are required'
    });
  }

  const ruleId = uuidv4();
  const rule = {
    id: ruleId,
    tenant_id: req.tenantId,
    name,
    metric_type: metricType,
    condition_operator: conditionOperator || '>',
    threshold_value: parseFloat(thresholdValue),
    duration_minutes: parseInt(durationMinutes || '2', 10),
    severity: severity || 'warning',
    is_enabled: isEnabled !== false,
    created_at: new Date(),
    updated_at: new Date()
  };

  try {
    if (db.isPostgres()) {
      await db.query(
        `INSERT INTO alert_rules (id, tenant_id, name, metric_type, condition_operator, threshold_value, duration_minutes, severity, is_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [rule.id, rule.tenant_id, rule.name, rule.metric_type, rule.condition_operator, rule.threshold_value, rule.duration_minutes, rule.severity, rule.is_enabled]
      );
    } else {
      db.memory.alert_rules.unshift(rule);
    }

    return res.status(201).json({ success: true, data: rule });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/alert-rules/:id
 */
router.put('/:id', requireRoles('admin', 'operator'), async (req, res) => {
  const { name, metricType, conditionOperator, thresholdValue, durationMinutes, severity, isEnabled } = req.body;

  try {
    if (db.isPostgres()) {
      const result = await db.query(
        `UPDATE alert_rules 
         SET name = COALESCE($1, name),
             metric_type = COALESCE($2, metric_type),
             condition_operator = COALESCE($3, condition_operator),
             threshold_value = COALESCE($4, threshold_value),
             duration_minutes = COALESCE($5, duration_minutes),
             severity = COALESCE($6, severity),
             is_enabled = COALESCE($7, is_enabled),
             updated_at = NOW()
         WHERE id = $8 AND tenant_id = $9 RETURNING *`,
        [name, metricType, conditionOperator, thresholdValue, durationMinutes, severity, isEnabled, req.params.id, req.tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Alert rule not found' });
      }

      return res.json({ success: true, data: result.rows[0] });
    } else {
      const rule = db.memory.alert_rules.find(r => r.id === req.params.id && r.tenant_id === req.tenantId);
      if (!rule) {
        return res.status(404).json({ success: false, error: 'Alert rule not found' });
      }

      if (name) rule.name = name;
      if (metricType) rule.metric_type = metricType;
      if (conditionOperator) rule.condition_operator = conditionOperator;
      if (thresholdValue !== undefined) rule.threshold_value = parseFloat(thresholdValue);
      if (durationMinutes !== undefined) rule.duration_minutes = parseInt(durationMinutes, 10);
      if (severity) rule.severity = severity;
      if (isEnabled !== undefined) rule.is_enabled = isEnabled;
      rule.updated_at = new Date();

      return res.json({ success: true, data: rule });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/alert-rules/:id
 */
router.delete('/:id', requireRoles('admin'), async (req, res) => {
  try {
    if (db.isPostgres()) {
      const result = await db.query(
        'DELETE FROM alert_rules WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [req.params.id, req.tenantId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Alert rule not found' });
      }
    } else {
      const index = db.memory.alert_rules.findIndex(r => r.id === req.params.id && r.tenant_id === req.tenantId);
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Alert rule not found' });
      }
      db.memory.alert_rules.splice(index, 1);
    }

    return res.json({ success: true, message: 'Alert rule deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
