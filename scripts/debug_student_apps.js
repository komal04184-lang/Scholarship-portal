const path = require('path');
const { Pool } = require(path.join(__dirname, '../services/identity_student_service/backend/node_modules/pg'));
const pool = new Pool({ connectionString: 'postgresql://postgres:Kom@l007@localhost:5432/application_db' });

async function main() {
  // The real student UUID in identity_db
  const studentUUID = '55095c83-0005-4f21-a27f-1cd48bad9343';

  const all = await pool.query('SELECT id, student_id, scholarship_id, status FROM applications ORDER BY created_at DESC');
  console.log('All applications:', all.rows);

  const byUUID = await pool.query('SELECT id, student_id, scholarship_id, status FROM applications WHERE student_id = $1', [studentUUID]);
  console.log('Applications for UUID student:', byUUID.rows);

  const byNum = await pool.query('SELECT id, student_id, scholarship_id, status FROM applications WHERE student_id = $1', ['1']);
  console.log('Applications for student_id=1:', byNum.rows);

  await pool.end();
}

main().catch(console.error);
