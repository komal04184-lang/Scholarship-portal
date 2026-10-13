/**
 * Migration Runner
 * Reads SQL files from the migrations directory and executes them against the database.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../src/config');

async function run() {
  const pool = new Pool({
    host: config.pg.host,
    port: config.pg.port,
    database: config.pg.database,
    user: config.pg.user,
    password: config.pg.password,
  });

  try {
    console.log('Running migrations...');
    const migrationDir = path.join(__dirname);
    const files = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`  Executing: ${file}`);
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await pool.query(sql);
      console.log(`  ✓ ${file} completed`);
    }

    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
