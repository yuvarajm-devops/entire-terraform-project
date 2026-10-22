const app = require('./app');
const config = require('./config');
const { startHeartbeatMonitor } = require('./services/heartbeatMonitor');

const PORT = config.port || 8080;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`Real-Time Server Monitoring Backend listening on :${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`=======================================================`);

  // Start background monitoring of server heartbeats
  startHeartbeatMonitor();
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing HTTP server gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
