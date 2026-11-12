const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool({
  host: config.pg.host,
  port: config.pg.port,
  database: config.pg.database,
  user: config.pg.user,
  password: config.pg.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', (client) => {
  client.query(`SET search_path TO ${config.pg.schema}, public, portal`);
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv === 'development' && process.env.DEBUG_SQL === 'true') {
    console.log(`[SQL] executed query: ${text.slice(0, 100)} (${duration}ms)`);
  }
  return res;
}

async function testConnection() {
  try {
    const res = await query('SELECT NOW() as now, current_database() as db');
    return {
      connected: true,
      time: res.rows[0].now,
      database: res.rows[0].db,
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
    };
  }
}

module.exports = {
  pool,
  query,
  getClient: () => pool.connect(),
  testConnection,
};

