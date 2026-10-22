const express = require('express');
const cors = require('cors');
const db = require('./db');

// Route modules
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const metricRoutes = require('./routes/metrics');
const logRoutes = require('./routes/logs');
const alertRoutes = require('./routes/alerts');
const alertRuleRoutes = require('./routes/alertRules');
const settingsRoutes = require('./routes/settings');
const overviewRoutes = require('./routes/overview');

const app = express();

// Security and utility middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Agent-Key']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * Health check endpoint.
 * Required by AWS Application Load Balancer target group and container checks.
 * Must listen on port 8080 and return HTTP 200 from /health.
 */
app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'healthy',
    service: 'realtime-monitoring-backend',
    database: db.isPostgres() ? 'postgresql' : 'resilient-in-memory',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/metrics', metricRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/alert-rules', alertRuleRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/overview', overviewRoutes);

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.originalUrl} not found`
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;
