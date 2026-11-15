const fs = require('fs');
const path = require('path');
const bcrypt = require(path.join(__dirname, '../services/identity_student_service/backend/node_modules/bcryptjs'));
const { Pool } = require(path.join(__dirname, '../services/identity_student_service/backend/node_modules/pg'));

const envFile = fs.readFileSync(path.join(__dirname, '../services/identity_student_service/backend/.env'), 'utf8');
const dbUrlLine = envFile.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=').slice(1).join('=').trim();

const pool = new Pool({ connectionString: dbUrl });

async function main() {
  const existing = await pool.query('SELECT * FROM users WHERE email = $1', ['reviewer@scholarship.gov.in']);
  if (existing.rows.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Reviewer@123', salt);
    const res = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, status, email_verified)
       VALUES ($1, $2, $3, $4, 'active', true)
       RETURNING id, username, email, role`,
      ['reviewer', 'reviewer@scholarship.gov.in', hash, 'reviewer']
    );
    console.log('Created reviewer user:', res.rows[0]);
  } else {
    console.log('Reviewer user already exists:', existing.rows[0].email);
  }
  await pool.end();
}

main().catch(console.error);
