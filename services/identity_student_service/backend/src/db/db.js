const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST ,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client (identity_db):", err.message);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development" && duration > 100) {
    console.log(`[SQL] executed query in ${duration}ms: ${text.substring(0, 80)}`);
  }
  return res;
}

async function getClient() {
  const client = await pool.connect();
  return client;
}

async function connectDB() {
  try {
    const res = await pool.query("SELECT current_database(), current_user, version()");
    console.log(`[Identity Service] Connected to PostgreSQL DB: ${res.rows[0].current_database} as ${res.rows[0].current_user}`);
    return true;
  } catch (err) {
    console.error(`[Identity Service] PostgreSQL Connection Error (identity_db): ${err.message}`);
    // Do not crash immediately so service can start in resilient mode
    return false;
  }
}

module.exports = {
  pool,
  query,
  getClient,
  connectDB,
};
