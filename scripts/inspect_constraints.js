const { Pool } = require('../services/identity_student_service/backend/node_modules/pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Kom@l007@localhost:5432/scholarship_db' });

async function main() {
  const res = await pool.query(
    "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'scholarships'::regclass"
  );
  console.log(res.rows);
  await pool.end();
}

main().catch(console.error);
