const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:local_environment_password@localhost:5432/payment_db',
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS disbursements (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL UNIQUE,
        student_id INTEGER NOT NULL,
        scholarship_id INTEGER NOT NULL,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
        currency VARCHAR(10) DEFAULT 'INR',
        transaction_ref VARCHAR(64) UNIQUE NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'NEFT/UPI',
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        initiated_by INTEGER,
        remarks TEXT,
        disbursed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[PaymentDB] Disbursements table verified/initialized.');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
