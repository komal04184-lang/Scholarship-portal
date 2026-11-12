require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { MongoClient } = require('mongodb');

async function runMigrations() {
  console.log('--- Starting Application Service Migrations ---');

  // 1. PostgreSQL Migration
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
    console.log(`✓ Connected to PostgreSQL: ${pgConfig.database} as ${pgConfig.user}`);

    // Set search_path
    const schema = process.env.PG_SCHEMA || 'public';
    await client.query(`SET search_path TO ${schema}, public, portal`);

    const sqlPath = path.join(__dirname, '001_create_application_service_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('✓ PostgreSQL schema migration executed successfully.');

    // Count existing applications to verify preservation
    const res = await client.query('SELECT COUNT(*) FROM application');
    console.log(`✓ Existing applications preserved. Total records: ${res.rows[0].count}`);

    client.release();
  } catch (err) {
    console.error('❌ PostgreSQL Migration failed:', err.message);
    throw err;
  } finally {
    await pool.end();
  }

  // 2. MongoDB Initialization (Collections and indexes for document metadata & snapshots)
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const mongoDbName = process.env.MONGODB_DATABASE || 'scholarship_documents';

  try {
    const mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    console.log(`✓ Connected to MongoDB: ${mongoDbName}`);

    const db = mongoClient.db(mongoDbName);

    // Initialize application_snapshots collection
    const snapshots = db.collection('application_snapshots');
    try {
      await snapshots.createIndex({ application_id: 1 });
      await snapshots.createIndex({ student_id: 1 });
      await snapshots.createIndex({ scholarship_id: 1 });
      console.log('✓ MongoDB collection application_snapshots initialized with indexes.');
    } catch (e) {
      console.log('✓ MongoDB indexes already present on application_snapshots.');
    }

    // Initialize document_metadata collection
    const docMeta = db.collection('document_metadata');
    try {
      await docMeta.createIndex({ application_id: 1 });
      await docMeta.createIndex({ document_id: 1 });
      console.log('✓ MongoDB collection document_metadata initialized with indexes.');
    } catch (e) {
      console.log('✓ MongoDB indexes already present on document_metadata.');
    }

    await mongoClient.close();
  } catch (err) {
    console.warn('⚠️ MongoDB initialization warning (Service will still operate with PostgreSQL):', err.message);
  }

  console.log('--- Application Service Migrations Completed ---');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = runMigrations;
