const { Pool } = require('pg');
const env = require('./env');

// Independent PostgreSQL Connection Pool for application_db
const poolConfig = env.postgres.connectionString
  ? { connectionString: env.postgres.connectionString }
  : {
      host: env.postgres.host,
      port: env.postgres.port,
      database: env.postgres.database,
      user: env.postgres.user,
      password: env.postgres.password,
      max: env.postgres.max,
      idleTimeoutMillis: env.postgres.idleTimeoutMillis,
      connectionTimeoutMillis: env.postgres.connectionTimeoutMillis,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client in application_db pool:', err.message);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  return res;
}

async function getClient() {
  const client = await pool.connect();
  return client;
}

async function testConnection() {
  try {
    const res = await pool.query('SELECT current_database(), current_user, version(), NOW() as current_time');
    return {
      connected: true,
      database: res.rows[0].current_database,
      user: res.rows[0].current_user,
      time: res.rows[0].current_time,
    };
  } catch (err) {
    return {
      connected: false,
      database: env.postgres.database,
      error: err.message,
    };
  }
}

async function closeConnections() {
  try {
    await pool.end();
  } catch (e) {}
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closeConnections,
};
