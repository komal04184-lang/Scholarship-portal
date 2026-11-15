const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: 'scholarship_db'
});

async function main() {
  try {
    const s = await pool.query('SELECT * FROM scholarships LIMIT 5');
    console.log('scholarships:', JSON.stringify(s.rows, null, 2));

    const cats = await pool.query('SELECT * FROM scholarship_categories');
    console.log('categories:', JSON.stringify(cats.rows, null, 2));

    const crit = await pool.query('SELECT * FROM scholarship_eligibility_criteria LIMIT 5');
    console.log('criteria:', JSON.stringify(crit.rows, null, 2));

    const docs = await pool.query('SELECT * FROM scholarship_required_documents LIMIT 5');
    console.log('required_documents:', JSON.stringify(docs.rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
