const path = require('path');
const { Pool } = require(path.join(__dirname, '../services/identity_student_service/backend/node_modules/pg'));
const pool = new Pool({ connectionString: 'postgresql://postgres:Kom@l007@localhost:5432/application_db' });

async function main() {
  const apps = await pool.query('SELECT id, application_number, student_id, scholarship_id, status FROM applications');
  console.log('existing applications in application_db:', apps.rows);
  await pool.end();
}

main().catch(console.error);
