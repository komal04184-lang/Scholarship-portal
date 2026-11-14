require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigrations() {
  console.log('--- Starting Application Service Migrations (Database: application_db) ---');

  // Load database configuration strictly for Application Service
  const host = process.env.DB_HOST || process.env.PGHOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10);
  const database = process.env.DB_NAME || 'application_db';
  const user = process.env.DB_USER || process.env.PGUSER || 'postgres';
  const password = process.env.DB_PASSWORD || process.env.PGPASSWORD || 'Kom@l007';

  const pool = new Pool({
    host,
    port,
    database,
    user,
    password,
    connectionTimeoutMillis: 5000,
  });

  let client;
  try {
    client = await pool.connect();
    console.log(`✓ Connected to PostgreSQL Database: ${database} as ${user}`);

    // Apply migrations
    const migrationFile = path.join(__dirname, '003_application_db_complete_schema.sql');
    if (fs.existsSync(migrationFile)) {
      console.log('Applying migration 003_application_db_complete_schema.sql...');
      const sql = fs.readFileSync(migrationFile, 'utf8');
      await client.query(sql);
      console.log('✓ Successfully applied 003_application_db_complete_schema.sql');
    }

    // Verify all 8 core tables exist
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map((r) => r.table_name);
    console.log('✓ Current tables in application_db:', tables);

    const requiredTables = [
      'applications',
      'application_form_answers',
      'application_document_requirements',
      'application_documents',
      'application_status_history',
      'application_audit_logs',
      'outbox_events',
      'idempotency_keys',
    ];

    const missing = requiredTables.filter((t) => !tables.includes(t));
    if (missing.length > 0) {
      console.warn('⚠️ Some required tables are missing:', missing);
    } else {
      console.log('✓ All 8 required Application Service tables verified.');
    }

    console.log('--- Application Service Migrations Successfully Finished ---');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
