const path = require('path');
const { Pool } = require(path.join(__dirname, '../services/identity_student_service/backend/node_modules/pg'));
const pool = new Pool({ connectionString: 'postgresql://postgres:Kom@l007@localhost:5432/application_db' });

async function main() {
  const cons = await pool.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'applications'
  `);
  console.log('constraints:', cons.rows);

  const idx = await pool.query(`
    SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'applications'
  `);
  console.log('indexes:', idx.rows);

  await pool.end();
}

main().catch(console.error);
