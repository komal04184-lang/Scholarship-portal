const path = require('path');
const pgPath = path.resolve('services', 'application-service', 'node_modules', 'pg');
const { Pool } = require(pgPath);
const pool = new Pool({ connectionString: 'postgresql://postgres:Kom%40l007@localhost:5432/application_db' });

async function main() {
  const constraints = await pool.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def 
    FROM pg_constraint 
    WHERE conrelid = 'applications'::regclass;
  `);
  console.log('Constraints on applications:', JSON.stringify(constraints.rows, null, 2));

  const indexes = await pool.query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'applications';
  `);
  console.log('Indexes on applications:', JSON.stringify(indexes.rows, null, 2));

  const duplicates = await pool.query(`
    SELECT student_id, scholarship_id, count(*) as count, array_agg(id::text) as ids, array_agg(status) as statuses
    FROM applications
    GROUP BY student_id, scholarship_id
    HAVING count(*) > 1;
  `);
  console.log('Duplicate applications (student_id + scholarship_id):', JSON.stringify(duplicates.rows, null, 2));

  const allApps = await pool.query('SELECT id, application_number, student_id, scholarship_id, status, created_at FROM applications ORDER BY created_at');
  console.log('Total applications count:', allApps.rows.length);
  console.log('All applications:', JSON.stringify(allApps.rows, null, 2));

  await pool.end();
}

main().catch(console.error);
