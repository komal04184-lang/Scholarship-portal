require('dotenv').config();
const { Pool } = require('pg');

async function seed() {
  console.log('--- Seeding Application Service Initial/Reference Data ---');
  const pgConfig = {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT, 10) || 5432,
    database: process.env.PGDATABASE || 'scholarship_portal',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'Kom@l007',
  };

  const pool = new Pool(pgConfig);

  try {
    const client = await pool.connect();
    // Verify applications exist
    const res = await client.query('SELECT COUNT(*) FROM application');
    console.log(`Current applications count in database: ${res.rows[0].count}`);
    client.release();
    console.log('✓ Seeding verification completed.');
  } catch (err) {
    console.error('Seed verification error:', err.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seed;

