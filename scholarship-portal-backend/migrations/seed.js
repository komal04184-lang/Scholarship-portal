/**
 * Seed Script — Populates development data
 * WARNING: Development only. Uses bcryptjs to hash passwords.
 *
 * Demo Accounts (DEVELOPMENT ONLY):
 *   Student:  student@demo.com / Demo@1234
 *   Student2: priya@demo.com / Demo@1234
 *   Admin:    admin@portal.com / Admin@1234
 *   Reviewer: reviewer@portal.com / Review@1234
 *   Reviewer: seniorreviewer@portal.com / Review@1234
 */
require('dotenv').config();
const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const config = require('../src/config');

async function seed() {
  const pool = new Pool({
    host: config.pg.host,
    port: config.pg.port,
    database: config.pg.database,
    user: config.pg.user,
    password: config.pg.password,
  });

  const mongoClient = new MongoClient(config.mongo.uri);

  try {
    console.log('Seeding database...');

    // Hash passwords
    const studentHash = await bcrypt.hash('Demo@1234', 10);
    const adminHash = await bcrypt.hash('Admin@1234', 10);
    const reviewerHash = await bcrypt.hash('Review@1234', 10);

    // ================================================================
    // STUDENTS
    // ================================================================
    console.log('  Seeding students...');
    await pool.query(`
      INSERT INTO portal.student (name, email, password_hash, phone, date_of_birth, gender, address)
      VALUES
        ('Rahul Sharma', 'student@demo.com', $1, '9876543210', '2002-05-15', 'Male', '45 MG Road, Delhi'),
        ('Priya Patel', 'priya@demo.com', $1, '9876543211', '2003-02-20', 'Female', '12 Park Street, Mumbai'),
        ('Amit Kumar', 'amit@demo.com', $1, '9876543212', '2001-11-08', 'Male', '78 Nehru Nagar, Pune'),
        ('Sneha Gupta', 'sneha@demo.com', $1, '9876543213', '2002-07-25', 'Female', '33 Civil Lines, Jaipur'),
        ('Arjun Singh', 'arjun@demo.com', $1, '9876543214', '2003-01-12', 'Male', '56 Shanti Nagar, Bangalore')
      ON CONFLICT (email) DO NOTHING
    `, [studentHash]);

    // ================================================================
    // STUDENT PROFILES
    // ================================================================
    console.log('  Seeding student profiles...');
    const students = await pool.query('SELECT student_id FROM portal.student ORDER BY student_id');
    const studentIds = students.rows.map(r => r.student_id);

    const profiles = [
      [studentIds[0], 'General', 350000, 4, 'Delhi', 'New Delhi'],
      [studentIds[1], 'OBC', 250000, 5, 'Maharashtra', 'Mumbai'],
      [studentIds[2], 'SC', 180000, 3, 'Maharashtra', 'Pune'],
      [studentIds[3], 'General', 500000, 6, 'Rajasthan', 'Jaipur'],
      [studentIds[4], 'ST', 200000, 4, 'Karnataka', 'Bangalore'],
    ];

    for (const p of profiles) {
      await pool.query(`
        INSERT INTO portal.student_profile (student_id, category, annual_income, family_size, state, city)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (student_id) DO NOTHING
      `, p);
    }

    // ================================================================
    // ACADEMIC DETAILS
    // ================================================================
    console.log('  Seeding academic details...');
    const academics = [
      [studentIds[0], 'IIT Delhi', 'B.Tech', 'Computer Science', 6, 8.5, 2025],
      [studentIds[1], 'Mumbai University', 'B.Sc', 'Physics', 4, 7.8, 2026],
      [studentIds[2], 'Pune University', 'B.Tech', 'Mechanical Engineering', 5, 6.9, 2025],
      [studentIds[3], 'Rajasthan University', 'MBA', 'Finance', 3, 8.2, 2026],
      [studentIds[4], 'Bangalore University', 'B.Tech', 'Electrical Engineering', 7, 7.5, 2025],
    ];

    for (const a of academics) {
      await pool.query(`
        INSERT INTO portal.academic_details (student_id, institution_name, course, branch, semester, cgpa, passing_year)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, a);
    }

    // ================================================================
    // SCHOLARSHIPS
    // ================================================================
    console.log('  Seeding scholarships...');
    await pool.query(`
      INSERT INTO portal.scholarship (name, description, amount, status, deadline)
      VALUES
        ('National Merit Scholarship', 'A prestigious scholarship awarded to students demonstrating exceptional academic excellence across all disciplines. This scholarship supports meritorious students who have maintained outstanding CGPA throughout their academic career.', 75000, 'ACTIVE', '2027-03-31'),
        ('SC/ST Welfare Scholarship', 'Government-funded scholarship program designed to support students from Scheduled Castes and Scheduled Tribes. Aims to promote higher education accessibility and reduce economic barriers for disadvantaged communities.', 50000, 'ACTIVE', '2027-04-15'),
        ('Women in STEM Scholarship', 'An initiative to encourage women pursuing education in Science, Technology, Engineering, and Mathematics fields. This scholarship recognizes outstanding female students contributing to STEM advancement.', 100000, 'ACTIVE', '2027-05-01'),
        ('Rural Excellence Award', 'Dedicated to students from rural areas who have shown remarkable academic achievement. This scholarship bridges the urban-rural educational divide and supports talent from underserved regions.', 60000, 'ACTIVE', '2027-02-28'),
        ('Post-Graduate Research Fellowship', 'A competitive fellowship for post-graduate students engaged in innovative research. Supports students pursuing MBA, M.Tech, or M.Sc with demonstrated research aptitude and scholarly publications.', 120000, 'ACTIVE', '2027-06-30'),
        ('Need-Based Financial Aid', 'Financial assistance for students from economically disadvantaged families. This aid program ensures that financial constraints do not prevent talented students from accessing quality higher education.', 45000, 'ACTIVE', '2027-04-30'),
        ('Engineering Excellence Scholarship', 'Recognizes outstanding engineering students across all branches. Awards are given based on academic performance, technical projects, and overall contribution to the engineering discipline.', 80000, 'ACTIVE', '2027-03-15'),
        ('Expired Example Scholarship', 'This scholarship program has concluded its current cycle. Previously supported first-generation college students with comprehensive financial and mentorship support.', 30000, 'CLOSED', '2025-12-31')
      ON CONFLICT DO NOTHING
    `);

    // ================================================================
    // ELIGIBILITY CRITERIA
    // ================================================================
    console.log('  Seeding eligibility criteria...');
    const scholarships = await pool.query('SELECT scholarship_id FROM portal.scholarship ORDER BY scholarship_id');
    const schIds = scholarships.rows.map(r => r.scholarship_id);

    const criteria = [
      [schIds[0], 8.0, 800000, 'B.Tech', null, 17, 30],
      [schIds[1], 6.0, 300000, null, 'SC', 17, 35],
      [schIds[2], 7.5, 600000, 'B.Tech', null, 17, 28],
      [schIds[3], 6.5, 400000, null, null, 17, 30],
      [schIds[4], 7.0, 1000000, 'MBA', null, 21, 35],
      [schIds[5], 5.0, 250000, null, null, 17, 30],
      [schIds[6], 7.0, 700000, 'B.Tech', null, 17, 28],
      [schIds[7], 6.0, 500000, null, null, 17, 30],
    ];

    for (const c of criteria) {
      await pool.query(`
        INSERT INTO portal.eligibility_criteria (scholarship_id, minimum_cgpa, maximum_income, eligible_course, eligible_category, minimum_age, maximum_age)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (scholarship_id) DO NOTHING
      `, c);
    }

    // ================================================================
    // REQUIRED DOCUMENTS
    // ================================================================
    console.log('  Seeding required documents...');
    const docs = [
      // National Merit
      [schIds[0], 'Income Certificate', true],
      [schIds[0], 'Academic Marksheet', true],
      [schIds[0], 'College ID Card', true],
      [schIds[0], 'Passport Photo', false],
      // SC/ST Welfare
      [schIds[1], 'Caste Certificate', true],
      [schIds[1], 'Income Certificate', true],
      [schIds[1], 'Academic Marksheet', true],
      [schIds[1], 'Aadhar Card Copy', true],
      // Women in STEM
      [schIds[2], 'Income Certificate', true],
      [schIds[2], 'Academic Marksheet', true],
      [schIds[2], 'Admission Proof', true],
      // Rural Excellence
      [schIds[3], 'Domicile Certificate', true],
      [schIds[3], 'Income Certificate', true],
      [schIds[3], 'Academic Marksheet', true],
      // PG Research
      [schIds[4], 'Research Proposal', true],
      [schIds[4], 'Academic Marksheet', true],
      [schIds[4], 'Faculty Recommendation', true],
      [schIds[4], 'Income Certificate', false],
      // Need-Based
      [schIds[5], 'Income Certificate', true],
      [schIds[5], 'BPL Card', true],
      [schIds[5], 'Academic Marksheet', true],
      // Engineering Excellence
      [schIds[6], 'Academic Marksheet', true],
      [schIds[6], 'College ID Card', true],
      [schIds[6], 'Income Certificate', false],
    ];

    for (const d of docs) {
      await pool.query(`
        INSERT INTO portal.required_document (scholarship_id, document_name, mandatory)
        VALUES ($1, $2, $3)
      `, d);
    }

    // ================================================================
    // ADMIN
    // ================================================================
    console.log('  Seeding admin...');
    await pool.query(`
      INSERT INTO portal.admin (name, email, password_hash, role)
      VALUES ('Portal Administrator', 'admin@portal.com', $1, 'ADMIN')
      ON CONFLICT (email) DO NOTHING
    `, [adminHash]);

    // ================================================================
    // REVIEWERS
    // ================================================================
    console.log('  Seeding reviewers...');
    await pool.query(`
      INSERT INTO portal.reviewer (name, email, password_hash, department, designation, status)
      VALUES
        ('Dr. Rajesh Verma', 'reviewer@portal.com', $1, 'Scholarship Cell', 'Senior Scholarship Officer', 'ACTIVE'),
        ('Prof. Anita Desai', 'seniorreviewer@portal.com', $1, 'Academic Affairs', 'Deputy Director Scholarships', 'ACTIVE'),
        ('Mr. Vikram Mehta', 'vikram.reviewer@portal.com', $1, 'Finance Department', 'Accounts Officer', 'ACTIVE')
      ON CONFLICT (email) DO NOTHING
    `, [reviewerHash]);

    // ================================================================
    // APPLICATIONS (sample data at various statuses)
    // ================================================================
    console.log('  Seeding applications...');
    const reviewers = await pool.query('SELECT reviewer_id FROM portal.reviewer ORDER BY reviewer_id');
    const revIds = reviewers.rows.map(r => r.reviewer_id);

    // App 1: Rahul applied to National Merit - APPROVED
    await pool.query(`
      INSERT INTO portal.application (student_id, scholarship_id, reviewer_id, status, submitted_at, updated_at)
      VALUES ($1, $2, $3, 'APPROVED', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days')
      ON CONFLICT (student_id, scholarship_id) DO NOTHING
    `, [studentIds[0], schIds[0], revIds[0]]);

    // App 2: Priya applied to Women in STEM - UNDER_REVIEW
    await pool.query(`
      INSERT INTO portal.application (student_id, scholarship_id, reviewer_id, status, submitted_at, updated_at)
      VALUES ($1, $2, $3, 'UNDER_REVIEW', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day')
      ON CONFLICT (student_id, scholarship_id) DO NOTHING
    `, [studentIds[1], schIds[2], revIds[1]]);

    // App 3: Amit applied to SC/ST Welfare - SUBMITTED
    await pool.query(`
      INSERT INTO portal.application (student_id, scholarship_id, status, submitted_at, updated_at)
      VALUES ($1, $2, 'SUBMITTED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
      ON CONFLICT (student_id, scholarship_id) DO NOTHING
    `, [studentIds[2], schIds[1]]);

    // App 4: Sneha applied to PG Research - REJECTED
    await pool.query(`
      INSERT INTO portal.application (student_id, scholarship_id, reviewer_id, status, submitted_at, updated_at)
      VALUES ($1, $2, $3, 'REJECTED', NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days')
      ON CONFLICT (student_id, scholarship_id) DO NOTHING
    `, [studentIds[3], schIds[4], revIds[1]]);

    // App 5: Arjun applied to Need-Based - CORRECTION_REQUIRED
    await pool.query(`
      INSERT INTO portal.application (student_id, scholarship_id, reviewer_id, status, submitted_at, updated_at)
      VALUES ($1, $2, $3, 'CORRECTION_REQUIRED', NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days')
      ON CONFLICT (student_id, scholarship_id) DO NOTHING
    `, [studentIds[4], schIds[5], revIds[0]]);

    // ================================================================
    // APPLICATION STATUS HISTORY
    // ================================================================
    console.log('  Seeding application status history...');
    const apps = await pool.query('SELECT application_id, student_id, scholarship_id, status FROM portal.application ORDER BY application_id');

    for (const app of apps.rows) {
      // Initial submission
      await pool.query(`
        INSERT INTO portal.application_status (application_id, status, comment, changed_by, changed_at)
        VALUES ($1, 'SUBMITTED', 'Application submitted by student', 'STUDENT', NOW() - INTERVAL '15 days')
      `, [app.application_id]);

      if (app.status === 'UNDER_REVIEW' || app.status === 'APPROVED' || app.status === 'REJECTED') {
        await pool.query(`
          INSERT INTO portal.application_status (application_id, status, comment, changed_by, changed_at)
          VALUES ($1, 'UNDER_REVIEW', 'Application assigned for review', 'ADMIN', NOW() - INTERVAL '10 days')
        `, [app.application_id]);
      }

      if (app.status === 'APPROVED') {
        await pool.query(`
          INSERT INTO portal.application_status (application_id, status, comment, changed_by, changed_at)
          VALUES ($1, 'APPROVED', 'Application meets all eligibility criteria. Approved for disbursement.', 'REVIEWER', NOW() - INTERVAL '2 days')
        `, [app.application_id]);
      }

      if (app.status === 'REJECTED') {
        await pool.query(`
          INSERT INTO portal.application_status (application_id, status, comment, changed_by, changed_at)
          VALUES ($1, 'REJECTED', 'CGPA does not meet minimum requirements for this scholarship.', 'REVIEWER', NOW() - INTERVAL '10 days')
        `, [app.application_id]);
      }

      if (app.status === 'CORRECTION_REQUIRED') {
        await pool.query(`
          INSERT INTO portal.application_status (application_id, status, comment, changed_by, changed_at)
          VALUES ($1, 'UNDER_REVIEW', 'Application assigned for review', 'ADMIN', NOW() - INTERVAL '5 days')
        `, [app.application_id]);
        await pool.query(`
          INSERT INTO portal.application_status (application_id, status, comment, changed_by, changed_at)
          VALUES ($1, 'CORRECTION_REQUIRED', 'Income certificate is unclear. Please upload a clearer copy.', 'REVIEWER', NOW() - INTERVAL '2 days')
        `, [app.application_id]);
      }
    }

    // ================================================================
    // NOTIFICATIONS
    // ================================================================
    console.log('  Seeding notifications...');
    if (apps.rows.length > 0) {
      await pool.query(`
        INSERT INTO portal.notification (student_id, title, message, type, reference_type, reference_id)
        VALUES
          ($1, 'Application Approved', 'Your application for National Merit Scholarship has been approved! Congratulations!', 'SUCCESS', 'APPLICATION', $2),
          ($1, 'Application Submitted', 'Your application has been submitted successfully. Track your application status in the dashboard.', 'INFO', 'APPLICATION', $2)
      `, [studentIds[0], apps.rows[0]?.application_id]);
    }

    if (apps.rows.length > 4) {
      await pool.query(`
        INSERT INTO portal.notification (student_id, title, message, type, reference_type, reference_id)
        VALUES ($1, 'Correction Required', 'Your application for Need-Based Financial Aid requires corrections. Please review the comments and resubmit.', 'WARNING', 'APPLICATION', $2)
      `, [studentIds[4], apps.rows[4]?.application_id]);
    }

    // ================================================================
    // PAYMENTS
    // ================================================================
    console.log('  Seeding payments...');
    if (apps.rows.length > 0) {
      // Payment for Rahul's approved application
      await pool.query(`
        INSERT INTO portal.payment (application_id, amount, payment_status, transaction_id, payment_date)
        VALUES ($1, 75000, 'SUCCESS', 'TXN-2027-0001-NMS', NOW() - INTERVAL '1 day')
        ON CONFLICT DO NOTHING
      `, [apps.rows[0]?.application_id]);
    }

    // ================================================================
    // MONGODB SEEDING
    // ================================================================
    console.log('  Seeding MongoDB...');
    await mongoClient.connect();
    const mdb = mongoClient.db(config.mongo.database);

    // Application Snapshots
    const snapshotsCol = mdb.collection('application_snapshots');
    await snapshotsCol.deleteMany({});
    if (apps.rows.length > 0) {
      await snapshotsCol.insertMany([
        {
          application_id: apps.rows[0]?.application_id,
          student_id: studentIds[0],
          scholarship_id: schIds[0],
          snapshot_date: new Date(),
          student_snapshot: { name: 'Rahul Sharma', email: 'student@demo.com', category: 'General', cgpa: 8.5, course: 'B.Tech' },
          scholarship_snapshot: { name: 'National Merit Scholarship', amount: 75000 },
          status: 'APPROVED',
        },
        {
          application_id: apps.rows[1]?.application_id,
          student_id: studentIds[1],
          scholarship_id: schIds[2],
          snapshot_date: new Date(),
          student_snapshot: { name: 'Priya Patel', email: 'priya@demo.com', category: 'OBC', cgpa: 7.8, course: 'B.Sc' },
          scholarship_snapshot: { name: 'Women in STEM Scholarship', amount: 100000 },
          status: 'UNDER_REVIEW',
        },
      ]);
    }

    // Audit Events
    const auditCol = mdb.collection('audit_events');
    await auditCol.deleteMany({});
    await auditCol.insertMany([
      {
        actor_id: 1,
        actor_role: 'ADMIN',
        action: 'SCHOLARSHIP_CREATED',
        resource_type: 'scholarship',
        resource_id: schIds[0],
        details: { name: 'National Merit Scholarship' },
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        correlation_id: 'seed-001',
      },
      {
        actor_id: revIds[0],
        actor_role: 'REVIEWER',
        action: 'APPLICATION_STATUS_CHANGED',
        resource_type: 'application',
        resource_id: apps.rows[0]?.application_id,
        details: { from_status: 'UNDER_REVIEW', to_status: 'APPROVED', comment: 'Approved for disbursement' },
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        correlation_id: 'seed-002',
      },
      {
        actor_id: 1,
        actor_role: 'ADMIN',
        action: 'PAYMENT_CREATED',
        resource_type: 'payment',
        resource_id: 1,
        details: { transaction_id: 'TXN-2027-0001-NMS', amount: 75000, status: 'SUCCESS' },
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        correlation_id: 'seed-003',
      },
      {
        actor_id: revIds[1],
        actor_role: 'REVIEWER',
        action: 'APPLICATION_STATUS_CHANGED',
        resource_type: 'application',
        resource_id: apps.rows[3]?.application_id,
        details: { from_status: 'UNDER_REVIEW', to_status: 'REJECTED', comment: 'CGPA not sufficient' },
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        correlation_id: 'seed-004',
      },
      {
        actor_id: revIds[0],
        actor_role: 'REVIEWER',
        action: 'DOCUMENT_VERIFIED',
        resource_type: 'application_document',
        resource_id: 1,
        details: { verification_status: 'VERIFIED' },
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        correlation_id: 'seed-005',
      },
    ]);

    // Review Notes
    const reviewNotesCol = mdb.collection('review_notes');
    await reviewNotesCol.deleteMany({});
    await reviewNotesCol.insertMany([
      {
        application_id: apps.rows[0]?.application_id,
        reviewer_id: revIds[0],
        note: 'Student has excellent academic record. All documents verified. Recommending approval.',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        application_id: apps.rows[3]?.application_id,
        reviewer_id: revIds[1],
        note: 'Student CGPA is 8.2 but course is MBA, which does not match eligible course for PG Research (requires MBA but minimum CGPA check failed based on committee review).',
        created_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      },
      {
        application_id: apps.rows[4]?.application_id,
        reviewer_id: revIds[0],
        note: 'Income certificate provided is not legible. Requesting student to upload a clearer copy.',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ]);

    // Create indexes
    await auditCol.createIndex({ timestamp: -1 });
    await auditCol.createIndex({ action: 1 });
    await auditCol.createIndex({ actor_role: 1 });
    await snapshotsCol.createIndex({ application_id: 1 });
    await reviewNotesCol.createIndex({ application_id: 1 });

    console.log('\n✓ Database seeding completed successfully!');
    console.log('\n--- DEVELOPMENT ACCOUNTS (DO NOT USE IN PRODUCTION) ---');
    console.log('Student:  student@demo.com / Demo@1234');
    console.log('Student:  priya@demo.com / Demo@1234');
    console.log('Admin:    admin@portal.com / Admin@1234');
    console.log('Reviewer: reviewer@portal.com / Review@1234');
    console.log('Reviewer: seniorreviewer@portal.com / Review@1234');
    console.log('-------------------------------------------------------');

  } catch (err) {
    console.error('Seeding failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
    await mongoClient.close();
  }
}

seed();
