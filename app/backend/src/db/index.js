const { Pool } = require('pg');
const config = require('../config');
const memoryStore = require('./memoryStore');

let pool = null;
let usePostgres = false;

// Attempt PostgreSQL initialization if configured
if (process.env.DATABASE_URL || process.env.DB_HOST) {
  try {
    pool = new Pool({
      connectionString: config.database.connectionString,
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      ssl: config.database.ssl,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 10000,
      max: 10
    });

    pool.on('error', (err) => {
      console.warn('PostgreSQL Pool unexpected error; falling back to memory store:', err.message);
      usePostgres = false;
    });

    // Test connection
    pool.query('SELECT NOW()')
      .then(() => {
        usePostgres = true;
        console.log('Connected to PostgreSQL successfully.');
      })
      .catch((err) => {
        console.log('PostgreSQL unavailable (' + err.message + '); operating in resilient memory mode.');
        usePostgres = false;
      });
  } catch (err) {
    console.log('PostgreSQL client init skipped; operating in memory mode.');
    usePostgres = false;
  }
} else {
  console.log('No DB_HOST / DATABASE_URL provided. Operating in memory store mode.');
}

module.exports = {
  isPostgres: () => usePostgres,
  pool,
  memory: memoryStore,

  async query(text, params) {
    if (usePostgres && pool) {
      return pool.query(text, params);
    }
    // Return null to signal memory store fallback
    return null;
  }
};
