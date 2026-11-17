const path = require('path');
const pgPath = path.resolve('services', 'application-service', 'node_modules', 'pg');
const { Pool } = require(pgPath);

async function inspectDb(dbName) {
  const pool = new Pool({ connectionString: `postgresql://postgres:Kom%40l007@localhost:5432/${dbName}` });
  const cols = await pool.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, ordinal_position;
  `);
  const grouped = {};
  for (const r of cols.rows) {
    grouped[r.table_name] = grouped[r.table_name] || [];
    grouped[r.table_name].push(`${r.column_name} (${r.data_type})`);
  }
  console.log(`=== ${dbName} ===`);
  console.log(JSON.stringify(grouped, null, 2));
  await pool.end();
}

async function main() {
  await inspectDb('scholarship_db');
  await inspectDb('application_db');
  await inspectDb('identity_db');
}

main().catch(console.error);
