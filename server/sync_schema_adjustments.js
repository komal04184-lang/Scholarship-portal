const { pool } = require('./src/config/database');

async function sync() {
  console.log('Running final schema adjustments on public tables...');

  // Ensure payment has created_at
  await pool.query(`
    ALTER TABLE public.payment ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE public.payment ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING';
    ALTER TABLE public.payment ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING';
  `);
  console.log('✓ payment updated');

  // Ensure application_document has document_name
  await pool.query(`
    ALTER TABLE public.application_document ADD COLUMN IF NOT EXISTS document_name VARCHAR(200);
    UPDATE public.application_document SET document_name = COALESCE(original_name, 'Document') WHERE document_name IS NULL;
  `);
  console.log('✓ application_document updated');

  // Ensure application has application_date
  await pool.query(`
    ALTER TABLE public.application ADD COLUMN IF NOT EXISTS application_date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.application ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE public.application ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  `);
  console.log('✓ application updated');

  const bcrypt = require('bcryptjs');
  const h1 = await bcrypt.hash('Admin@1234', 10);
  const h2 = await bcrypt.hash('AdminPassword123!', 10);
  await pool.query(`
    INSERT INTO public.admin (name, email, password, password_hash, role)
    VALUES
      ('Portal Administrator', 'admin@portal.com', $1, $1, 'ADMIN'),
      ('Chief Scholarship Admin', 'admin@scholarship.gov.in', $2, $2, 'ADMIN')
    ON CONFLICT (email) DO NOTHING
  `, [h1, h2]);
  console.log('✓ admin accounts configured');

  console.log('Done!');
  await pool.end();
}

sync().catch(err => {
  console.error(err);
  process.exit(1);
});
