const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Kom@l007@localhost:5432/scholarship_db',
});

async function migrate() {
  console.log('Inspecting existing scholarships and constraints in scholarship_db...');
  const existing = await pool.query('SELECT DISTINCT status FROM scholarships');
  console.log('Distinct existing statuses:', existing.rows.map(r => r.status));

  console.log('Updating scholarships_status_check constraint to include paused...');
  await pool.query('ALTER TABLE scholarships DROP CONSTRAINT IF EXISTS scholarships_status_check');
  await pool.query(`
    ALTER TABLE scholarships ADD CONSTRAINT scholarships_status_check 
    CHECK (status::text = ANY (ARRAY['draft'::character varying, 'published'::character varying, 'paused'::character varying, 'closed'::character varying, 'archived'::character varying]::text[]))
  `);
  console.log('✓ Successfully updated constraint.');

  const res = await pool.query(`SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'scholarships_status_check'`);
  console.log('New constraint:', res.rows[0]);
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
