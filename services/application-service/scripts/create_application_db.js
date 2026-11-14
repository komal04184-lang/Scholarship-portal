const { Client } = require('pg');
require('dotenv').config();

async function checkAndCreateDatabase() {
  const host = process.env.DB_HOST || process.env.PGHOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10);
  const user = process.env.DB_USER || process.env.PGUSER || 'postgres';
  const password = process.env.DB_PASSWORD || process.env.PGPASSWORD || 'Kom@l007';
  const targetDb = process.env.DB_NAME || 'application_db';

  console.log(`Connecting to PostgreSQL at ${host}:${port} as ${user} to check/create database: ${targetDb}...`);

  const client = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres', // Connect to default maintenance database
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL maintenance database.');

    const checkRes = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDb]
    );

    if (checkRes.rows.length === 0) {
      console.log(`Database "${targetDb}" does not exist. Creating...`);
      // CREATE DATABASE cannot run in a transaction or with parameterized query for dbname
      await client.query(`CREATE DATABASE "${targetDb}" WITH OWNER = "${user}" ENCODING = 'UTF8';`);
      console.log(`✓ Database "${targetDb}" created successfully.`);
    } else {
      console.log(`✓ Database "${targetDb}" already exists.`);
    }
  } catch (err) {
    console.error('Error creating database:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkAndCreateDatabase();

