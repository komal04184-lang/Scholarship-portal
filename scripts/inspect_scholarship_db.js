const path = require('path');
const pgPath = path.resolve(__dirname, '..', 'services', 'application-service', 'node_modules', 'pg');
const { Pool } = require(pgPath);
const pool = new Pool({ connectionString: 'postgresql://postgres:Kom%40l007@localhost:5432/scholarship_db' });

async function inspectLive() {
  const indexes = await pool.query(`
    SELECT tablename, indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    ORDER BY tablename, indexname;
  `);

  const constraints = await pool.query(`
    SELECT conname, contype, conrelid::regclass::text as tablename, pg_get_constraintdef(oid) as def 
    FROM pg_constraint 
    WHERE connamespace = 'public'::regnamespace 
    ORDER BY tablename, conname;
  `);

  const sequences = await pool.query(`
    SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public';
  `);

  const triggers = await pool.query(`
    SELECT trigger_name, event_manipulation, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public';
  `);

  console.log('=== LIVE SCHOLARSHIP_DB INDEXES ===\n', JSON.stringify(indexes.rows, null, 2));
  console.log('\n=== LIVE SCHOLARSHIP_DB CONSTRAINTS ===\n', JSON.stringify(constraints.rows, null, 2));
  console.log('\n=== LIVE SCHOLARSHIP_DB SEQUENCES ===\n', JSON.stringify(sequences.rows, null, 2));
  console.log('\n=== LIVE SCHOLARSHIP_DB TRIGGERS ===\n', JSON.stringify(triggers.rows, null, 2));

  pool.end();
}

inspectLive().catch(e => { console.error(e); pool.end(); });
