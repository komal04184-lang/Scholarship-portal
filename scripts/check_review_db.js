const path = require('path');
const { Pool } = require(path.join(__dirname, '../services/identity_student_service/backend/node_modules/pg'));
const pool = new Pool({ connectionString: 'postgresql://postgres:Kom@l007@localhost:5432/review_db' });

const fs = require('fs');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '../services/review-service/sql/schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('reviews & review_history tables ensured safely.');
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('tables in review_db now:', tables.rows.map(r => r.table_name));
  await pool.end();
}

main().catch(console.error);
