/**
 * Migration runner for Identity Student Service (identity_db)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { Client, Pool } = require('pg');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Kom@l007',
  database: process.env.DB_NAME || 'identity_db',
};

async function ensureDatabaseExists() {
  const rootClient = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'postgres',
  });

  try {
    await rootClient.connect();
    const checkRes = await rootClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbConfig.database]
    );

    if (checkRes.rowCount === 0) {
      console.log(`Database "${dbConfig.database}" does not exist. Creating...`);
      await rootClient.query(`CREATE DATABASE "${dbConfig.database}"`);
      console.log(`Database "${dbConfig.database}" created successfully.`);
    } else {
      console.log(`Database "${dbConfig.database}" already exists.`);
    }
  } catch (err) {
    console.warn(`Note: Could not check/create database from postgres root: ${err.message}. Assuming "${dbConfig.database}" exists.`);
  } finally {
    try {
      await rootClient.end();
    } catch (_) {}
  }
}

async function runMigrations() {
  console.log(`--- Running Identity Service Migrations on ${dbConfig.database} ---`);
  await ensureDatabaseExists();

  const pool = new Pool(dbConfig);
  const client = await pool.connect();

  try {
    // 1. Run 001_create_identity_schema.sql
    const sqlPath = path.join(__dirname, '001_create_identity_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying schema migrations...');
    await client.query(sql);
    console.log('Schema migration applied successfully.');

    // 2. Ensure initial seed admin user exists
    const adminEmail = 'admin@scholarship.gov.in';
    const existingAdmin = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    if (existingAdmin.rowCount === 0) {
      console.log('Seeding default admin user...');
      const adminHash = await bcrypt.hash('Admin@123', 10);
      await client.query(
        `INSERT INTO users (username, email, password_hash, role, status, email_verified)
         VALUES ($1, $2, $3, 'admin', 'active', true)`,
        ['admin', adminEmail, adminHash]
      );
      console.log('Default admin user created: admin@scholarship.gov.in / Admin@123');
    }

    // 3. Ensure test student user exists
    const studentEmail = 'student@scholarship.gov.in';
    const existingStudent = await client.query('SELECT id FROM users WHERE email = $1', [studentEmail]);

    if (existingStudent.rowCount === 0) {
      console.log('Seeding default test student user...');
      const studentHash = await bcrypt.hash('Student@123', 10);
      const studentRes = await client.query(
        `INSERT INTO users (username, email, password_hash, role, status, email_verified)
         VALUES ($1, $2, $3, 'student', 'active', true)
         RETURNING id`,
        ['student', studentEmail, studentHash]
      );

      const userId = studentRes.rows[0].id;
      await client.query(
        `INSERT INTO student_profiles (
          user_id, enrollment_no, dob, gender, phone, address, city, state, country,
          category, family_income, family_size, institution_name, course, branch,
          academic_year, semester, cgpa, passing_year, marks_percentage, profile_complete
        ) VALUES (
          $1, 'ENR-2024-001', '2002-05-15', 'Male', '+91 9876543210', '123 College Road',
          'New Delhi', 'Delhi', 'India', 'General', 450000.00, 4,
          'National Institute of Technology', 'B.Tech', 'Computer Science & Engineering',
          '2024-2025', 5, 8.75, 2026, 85.50, true
        )`,
        [userId]
      );
      console.log('Default student user created: student@scholarship.gov.in / Student@123');
    }

    // 4. Verify created tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\nVerified tables in identity_db:');
    tableRes.rows.forEach(r => console.log(`  - ${r.table_name}`));
    console.log('\nAll migrations and seeds applied successfully!\n');

  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };

