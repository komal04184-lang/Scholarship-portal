const { Client } = require('pg');

async function checkData() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Kom@l007',
    database: 'application_db'
  });

  try {
    await client.connect();
    const countRes = await client.query('SELECT COUNT(*) FROM applications');
    console.log('Row count in applications:', countRes.rows[0].count);
    if (parseInt(countRes.rows[0].count, 10) > 0) {
      const sample = await client.query('SELECT * FROM applications LIMIT 3');
      console.log('Sample rows:', sample.rows);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkData();

