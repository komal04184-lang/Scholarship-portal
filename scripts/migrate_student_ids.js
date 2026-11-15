const path = require('path');
const { Pool } = require(path.join(__dirname, '../services/identity_student_service/backend/node_modules/pg'));
const pool = new Pool({ connectionString: 'postgresql://postgres:Kom@l007@localhost:5432/application_db' });

// The real student UUID from identity_db (student@scholarship.gov.in)
const REAL_STUDENT_UUID = '55095c83-0005-4f21-a27f-1cd48bad9343';

async function main() {
  // Migrate all existing applications from student_id='1' to the real UUID
  const result = await pool.query(
    `UPDATE applications SET student_id = $1 WHERE student_id = '1'`,
    [REAL_STUDENT_UUID]
  );
  console.log(`Updated ${result.rowCount} applications from student_id='1' to UUID ${REAL_STUDENT_UUID}`);

  const verify = await pool.query('SELECT id, student_id, scholarship_id, status FROM applications WHERE student_id = $1', [REAL_STUDENT_UUID]);
  console.log('Applications now for student UUID:', verify.rows.length);
  verify.rows.forEach(a => console.log(`  - [${a.status}] scholarship: ${a.scholarship_id}`));

  await pool.end();
}

main().catch(console.error);
