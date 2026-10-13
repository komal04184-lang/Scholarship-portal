const { pool } = require('./src/config/database');

async function check() {
  const tables = [
    'student', 'student_profile', 'academic_details', 'scholarship',
    'eligibility_criteria', 'required_document', 'reviewer', 'grant_record',
    'application', 'application_status', 'application_document', 'payment'
  ];

  for (const t of tables) {
    const colRes = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [t]
    );
    console.log(`=== public.${t} ===`);
    console.log(colRes.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
  }

  await pool.end();
}

check().catch(console.error);
