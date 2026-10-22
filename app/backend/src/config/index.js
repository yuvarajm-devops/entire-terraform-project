require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'devops-secret-token-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  database: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'monitoring_db',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  },
  monitoring: {
    heartbeatIntervalSeconds: parseInt(process.env.HEARTBEAT_INTERVAL || '30', 10),
    offlineThresholdSeconds: parseInt(process.env.OFFLINE_THRESHOLD || '90', 10),
    metricRetentionDays: parseInt(process.env.METRIC_RETENTION_DAYS || '30', 10)
  }
};
