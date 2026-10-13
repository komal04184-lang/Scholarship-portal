const { pool } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function seedPublic() {
  console.log('Seeding public schema tables with demo accounts & records...');

  // Ensure unique constraints exist
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_payment_app') THEN
        ALTER TABLE public.payment ADD CONSTRAINT unique_payment_app UNIQUE (application_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_reviewer_email') THEN
        ALTER TABLE public.reviewer ADD CONSTRAINT unique_reviewer_email UNIQUE (email);
      END IF;
    END $$;
  `);

  const studentHash = await bcrypt.hash('Demo@1234', 10);
  const adminHash = await bcrypt.hash('Admin@1234', 10);
  const reviewerHash = await bcrypt.hash('Review@1234', 10);

  // 1. Students
  await pool.query(`
    INSERT INTO public.student (name, email, password, password_hash, phone, date_of_birth, gender, address)
    VALUES
      ('Rahul Sharma', 'student@demo.com', $1, $1, '9876543210', '2002-05-15', 'Male', '45 MG Road, Delhi'),
      ('Priya Patel', 'priya@demo.com', $1, $1, '9876543211', '2003-02-20', 'Female', '12 Park Street, Mumbai'),
      ('Amit Kumar', 'amit@demo.com', $1, $1, '9876543212', '2001-11-08', 'Male', '78 Nehru Nagar, Pune'),
      ('Sneha Gupta', 'sneha@demo.com', $1, $1, '9876543213', '2002-07-25', 'Female', '33 Civil Lines, Jaipur'),
      ('Arjun Singh', 'arjun@demo.com', $1, $1, '9876543214', '2003-01-12', 'Male', '56 Shanti Nagar, Bangalore')
    ON CONFLICT (email) DO NOTHING
  `, [studentHash]);

  const students = await pool.query('SELECT student_id, email FROM public.student ORDER BY student_id');
  const studentMap = {};
  students.rows.forEach(s => { studentMap[s.email] = s.student_id; });

  const s1 = studentMap['student@demo.com'];
  const s2 = studentMap['priya@demo.com'];
  const s3 = studentMap['amit@demo.com'];
  const s4 = studentMap['sneha@demo.com'];
  const s5 = studentMap['arjun@demo.com'];

  // 2. Student Profiles
  if (s1) {
    const profiles = [
      [s1, 'General', 350000, 4, 'Delhi', 'New Delhi'],
      [s2, 'OBC', 250000, 5, 'Maharashtra', 'Mumbai'],
      [s3, 'SC', 180000, 3, 'Maharashtra', 'Pune'],
      [s4, 'General', 500000, 6, 'Rajasthan', 'Jaipur'],
      [s5, 'ST', 200000, 4, 'Karnataka', 'Bangalore'],
    ];
    for (const p of profiles) {
      if (p[0]) {
        await pool.query(`
          INSERT INTO public.student_profile (student_id, category, annual_income, family_size, state, city)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (student_id) DO NOTHING
        `, p);
      }
    }
  }

  // 3. Academic Details
  if (s1) {
    const existingAcad = await pool.query('SELECT COUNT(*) as count FROM public.academic_details WHERE student_id = $1', [s1]);
    if (parseInt(existingAcad.rows[0].count, 10) === 0) {
      const academics = [
        [s1, 'IIT Delhi', 'B.Tech', 'Computer Science', 6, 8.5, 2025],
        [s2, 'Mumbai University', 'B.Sc', 'Physics', 4, 7.8, 2026],
        [s3, 'Pune University', 'B.Tech', 'Mechanical Engineering', 5, 6.9, 2025],
        [s4, 'Rajasthan University', 'MBA', 'Finance', 3, 8.2, 2026],
        [s5, 'Bangalore University', 'B.Tech', 'Electrical Engineering', 7, 7.5, 2025],
      ];
      for (const a of academics) {
        if (a[0]) {
          await pool.query(`
            INSERT INTO public.academic_details (student_id, institution_name, course, branch, semester, cgpa, passing_year)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, a);
        }
      }
    }
  }

  // 4. Scholarships
  const existingSch = await pool.query('SELECT COUNT(*) as count FROM public.scholarship');
  if (parseInt(existingSch.rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO public.scholarship (name, description, amount, status, deadline)
      VALUES
        ('National Merit Scholarship', 'A prestigious scholarship awarded to students demonstrating exceptional academic excellence across all disciplines. Supports meritorious students who have maintained outstanding CGPA throughout their academic career.', 75000, 'ACTIVE', '2027-03-31'),
        ('Women in STEM Scholarship', 'An initiative to encourage women pursuing education in Science, Technology, Engineering, and Mathematics fields. Recognizes outstanding female students contributing to STEM advancement.', 100000, 'ACTIVE', '2027-05-01'),
        ('Need-Based Financial Aid', 'Financial assistance for students from economically disadvantaged families. Ensures financial constraints do not prevent talented students from accessing quality higher education.', 45000, 'ACTIVE', '2027-04-30'),
        ('Post-Graduate Research Fellowship', 'A competitive fellowship for post-graduate students engaged in innovative research. Supports students pursuing MBA, M.Tech, or M.Sc with demonstrated research aptitude.', 120000, 'ACTIVE', '2027-06-30'),
        ('SC/ST Welfare Scholarship', 'Government-funded scholarship program designed to support students from Scheduled Castes and Scheduled Tribes. Promotes higher education accessibility.', 50000, 'ACTIVE', '2027-04-15'),
        ('Engineering Excellence Scholarship', 'Recognizes outstanding engineering students across all branches based on academic performance and technical project contributions.', 80000, 'ACTIVE', '2027-03-15'),
        ('Rural Excellence Award', 'Dedicated to students from rural areas who have shown remarkable academic achievement. Bridges the urban-rural educational divide.', 60000, 'ACTIVE', '2027-02-28')
    `);
  }

  const schRows = await pool.query('SELECT scholarship_id, name FROM public.scholarship ORDER BY scholarship_id');

  // 5. Eligibility Criteria
  for (const s of schRows.rows) {
    let minCgpa = 7.0;
    let maxIncome = 800000;
    let course = 'B.Tech';
    let cat = null;

    if (s.name.includes('Merit')) { minCgpa = 8.0; maxIncome = 800000; course = 'B.Tech'; }
    else if (s.name.includes('STEM')) { minCgpa = 7.5; maxIncome = 600000; course = 'B.Tech'; }
    else if (s.name.includes('Need')) { minCgpa = 5.0; maxIncome = 250000; course = null; }
    else if (s.name.includes('Research')) { minCgpa = 7.0; maxIncome = 1000000; course = 'MBA'; }
    else if (s.name.includes('SC/ST')) { minCgpa = 6.0; maxIncome = 300000; course = null; cat = 'SC'; }

    await pool.query(`
      INSERT INTO public.eligibility_criteria (scholarship_id, minimum_cgpa, maximum_income, eligible_course, eligible_category, minimum_age, maximum_age)
      VALUES ($1, $2, $3, $4, $5, 17, 30)
      ON CONFLICT (scholarship_id) DO NOTHING
    `, [s.scholarship_id, minCgpa, maxIncome, course, cat]);
  }

  // 6. Required Documents
  for (const s of schRows.rows) {
    const existingDocs = await pool.query('SELECT COUNT(*) as count FROM public.required_document WHERE scholarship_id = $1', [s.scholarship_id]);
    if (parseInt(existingDocs.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO public.required_document (scholarship_id, document_name, mandatory)
        VALUES
          ($1, 'Academic Marksheet', true),
          ($1, 'Income Certificate', true),
          ($1, 'College ID Card', false)
      `, [s.scholarship_id]);
    }
  }

  // 7. Reviewers
  await pool.query(`
    INSERT INTO public.reviewer (name, email, password, password_hash, department, designation, status)
    VALUES
      ('Dr. Rajesh Verma', 'reviewer@portal.com', $1, $1, 'Scholarship Cell', 'Senior Scholarship Officer', 'ACTIVE'),
      ('Prof. Anita Desai', 'seniorreviewer@portal.com', $1, $1, 'Academic Affairs', 'Deputy Director Scholarships', 'ACTIVE')
    ON CONFLICT (email) DO NOTHING
  `, [reviewerHash]);

  const revRows = await pool.query('SELECT reviewer_id FROM public.reviewer ORDER BY reviewer_id');
  const revId1 = revRows.rows[0]?.reviewer_id;

  // 8. Grant Records
  const grantSchId = schRows.rows[0]?.scholarship_id;
  if (grantSchId) {
    const existingGrant = await pool.query('SELECT COUNT(*) as count FROM public.grant_record WHERE scholarship_id = $1', [grantSchId]);
    if (parseInt(existingGrant.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO public.grant_record (scholarship_id, grant_name, amount, status)
        VALUES ($1, 'National Merit Sanction Grant', 75000, 'SANCTIONED')
      `, [grantSchId]);
    }
  }
  const grantRows = await pool.query('SELECT grant_id FROM public.grant_record LIMIT 1');
  const grantId = grantRows.rows[0]?.grant_id;

  // 9. Applications
  if (s1 && grantSchId) {
    await pool.query(`
      INSERT INTO public.application (student_id, scholarship_id, grant_id, reviewer_id, status, submitted_at, statement, sop)
      VALUES ($1, $2, $3, $4, 'APPROVED', NOW() - INTERVAL '10 days', 'I am passionate about software engineering and open-source systems.', 'I am passionate about software engineering and open-source systems.')
      ON CONFLICT (student_id, scholarship_id) DO NOTHING
    `, [s1, grantSchId, grantId, revId1]);
  }

  if (s2 && schRows.rows[1]) {
    await pool.query(`
      INSERT INTO public.application (student_id, scholarship_id, reviewer_id, status, submitted_at, statement, sop)
      VALUES ($1, $2, $3, 'UNDER_REVIEW', NOW() - INTERVAL '3 days', 'Advancing research in quantum computing and experimental physics.', 'Advancing research in quantum computing and experimental physics.')
      ON CONFLICT (student_id, scholarship_id) DO NOTHING
    `, [s2, schRows.rows[1].scholarship_id, revId1]);
  }

  const appRows = await pool.query('SELECT application_id FROM public.application ORDER BY application_id');

  // 10. Application Status History
  if (appRows.rows.length > 0) {
    for (const app of appRows.rows) {
      const existingStatus = await pool.query('SELECT COUNT(*) as count FROM public.application_status WHERE application_id = $1', [app.application_id]);
      if (parseInt(existingStatus.rows[0].count, 10) === 0) {
        await pool.query(`
          INSERT INTO public.application_status (application_id, status, comment, changed_by)
          VALUES ($1, 'SUBMITTED', 'Application submitted by student with uploaded transcripts', 'STUDENT')
        `, [app.application_id]);
      }
    }
  }

  // 11. Application Document
  if (appRows.rows.length > 0) {
    const existingDoc = await pool.query('SELECT COUNT(*) as count FROM public.application_document WHERE application_id = $1', [appRows.rows[0].application_id]);
    if (parseInt(existingDoc.rows[0].count, 10) === 0) {
      const reqDoc = await pool.query('SELECT requirement_id FROM public.required_document LIMIT 1');
      const reqId = reqDoc.rows[0]?.requirement_id || 1;
      await pool.query(`
        INSERT INTO public.application_document (application_id, requirement_id, document_id, document_path, original_name, mime_type, file_size, verification_status)
        VALUES ($1, $2, $2, 'semester_transcript.pdf', 'Semester_Transcript.pdf', 'application/pdf', 1048576, 'VERIFIED')
      `, [appRows.rows[0].application_id, reqId]);
    }
  }

  // 12. Payment
  if (appRows.rows.length > 0) {
    await pool.query(`
      INSERT INTO public.payment (application_id, amount, payment_date, status, transaction_reference, transaction_id, payment_status)
      VALUES ($1, 75000, NOW() - INTERVAL '2 days', 'SUCCESS', 'TXN-2026-NMS-001', 'TXN-2026-NMS-001', 'SUCCESS')
      ON CONFLICT (application_id) DO NOTHING
    `, [appRows.rows[0].application_id]);
  }

  // 13. Admin
  await pool.query(`
    INSERT INTO public.admin (name, email, password, password_hash, role)
    VALUES ('Portal Administrator', 'admin@portal.com', $1, $1, 'ADMIN')
    ON CONFLICT (email) DO NOTHING
  `, [adminHash]);

  // 14. Notifications
  if (s1 && appRows.rows.length > 0) {
    const existingNotif = await pool.query('SELECT COUNT(*) as count FROM public.notification WHERE student_id = $1', [s1]);
    if (parseInt(existingNotif.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO public.notification (student_id, title, message, type, reference_type, reference_id)
        VALUES ($1, 'Application Approved', 'Congratulations! Your scholarship grant of ₹75,000 has been sanctioned.', 'SUCCESS', 'APPLICATION', $2)
      `, [s1, appRows.rows[0].application_id]);
    }
  }

  console.log('✓ Public schema tables populated successfully with initial test data!');
  await pool.end();
}

seedPublic().catch(err => {
  console.error('Seed public failed:', err);
  process.exit(1);
});
