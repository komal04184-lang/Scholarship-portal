const { Client } = require('pg');
require('dotenv').config();

async function inspectDb() {
  const host = process.env.DB_HOST || process.env.PGHOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10);
  const user = process.env.DB_USER || process.env.PGUSER || 'postgres';
  const password = process.env.DB_PASSWORD || process.env.PGPASSWORD || 'Kom@l007';
  const database = process.env.DB_NAME || 'application_db';

  const client = new Client({ host, port, user, password, database });

  try {
    await client.connect();
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('TABLES IN', database, ':', res.rows.map(x => x.table_name));
  } catch (err) {
    console.error('Inspection error:', err.message);
  } finally {
    await client.end();
  }
}

inspectDb();

