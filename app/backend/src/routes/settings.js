const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRoles } = require('../middleware/auth');

router.use(authenticateToken);

/**
 * GET /api/settings
 */
router.get('/', async (req, res) => {
  try {
    if (db.isPostgres()) {
      const result = await db.query(
        'SELECT * FROM settings WHERE tenant_id = $1 LIMIT 1',
        [req.tenantId]
      );
      return res.json({
        success: true,
        data: result.rows[0] || {
          heartbeat_interval_seconds: 30,
          offline_threshold_seconds: 90,
          retention_days: 30,
          webhook_url: '',
          notification_email: '',
          enable_notifications: true
        }
      });
    } else {
      return res.json({ success: true, data: db.memory.settings });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/settings
 */
router.put('/', requireRoles('admin'), async (req, res) => {
  const { heartbeatIntervalSeconds, offlineThresholdSeconds, retentionDays, webhookUrl, notificationEmail, enableNotifications } = req.body;

  try {
    if (db.isPostgres()) {
      const result = await db.query(
        `INSERT INTO settings (tenant_id, heartbeat_interval_seconds, offline_threshold_seconds, retention_days, webhook_url, notification_email, enable_notifications, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (tenant_id) DO UPDATE
         SET heartbeat_interval_seconds = COALESCE($2, settings.heartbeat_interval_seconds),
             offline_threshold_seconds = COALESCE($3, settings.offline_threshold_seconds),
             retention_days = COALESCE($4, settings.retention_days),
             webhook_url = COALESCE($5, settings.webhook_url),
             notification_email = COALESCE($6, settings.notification_email),
             enable_notifications = COALESCE($7, settings.enable_notifications),
             updated_at = NOW()
         RETURNING *`,
        [req.tenantId, heartbeatIntervalSeconds, offlineThresholdSeconds, retentionDays, webhookUrl, notificationEmail, enableNotifications]
      );

      return res.json({ success: true, data: result.rows[0] });
    } else {
      if (heartbeatIntervalSeconds !== undefined) db.memory.settings.heartbeat_interval_seconds = parseInt(heartbeatIntervalSeconds, 10);
      if (offlineThresholdSeconds !== undefined) db.memory.settings.offline_threshold_seconds = parseInt(offlineThresholdSeconds, 10);
      if (retentionDays !== undefined) db.memory.settings.retention_days = parseInt(retentionDays, 10);
      if (webhookUrl !== undefined) db.memory.settings.webhook_url = webhookUrl;
      if (notificationEmail !== undefined) db.memory.settings.notification_email = notificationEmail;
      if (enableNotifications !== undefined) db.memory.settings.enable_notifications = enableNotifications;

      return res.json({ success: true, data: db.memory.settings });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
