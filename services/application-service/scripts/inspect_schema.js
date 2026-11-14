const { Client } = require('pg');

async function inspectSchema() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Kom@l007',
    database: 'application_db'
  });

  try {
    await client.connect();
    const tables = [
      'applications',
      'application_form_answers',
      'application_document_requirements',
      'application_documents',
      'application_status_history',
      'application_audit_logs',
      'outbox_events',
      'idempotency_keys'
    ];

    for (const t of tables) {
      const res = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [t]);
      console.log(`\n=== TABLE: ${t} ===`);
      res.rows.forEach(c => {
        console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable}, default: ${c.column_default})`);
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

inspectSchema();

