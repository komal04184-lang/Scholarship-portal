const { pool } = require('../config/database');
const { getDb } = require('../config/mongodb');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

// ============================================================
// DASHBOARD
// ============================================================
async function getDashboard(req, res, next) {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM student) as total_students,
        (SELECT COUNT(*) FROM scholarship) as total_scholarships,
        (SELECT COUNT(*) FROM scholarship WHERE status = 'ACTIVE') as active_scholarships,
        (SELECT COUNT(*) FROM application) as total_applications,
        (SELECT COUNT(*) FROM application WHERE status IN ('SUBMITTED','UNDER_REVIEW')) as pending_applications,
        (SELECT COUNT(*) FROM application WHERE status = 'APPROVED') as approved_applications,
        (SELECT COUNT(*) FROM application WHERE status = 'REJECTED') as rejected_applications,
        (SELECT COUNT(*) FROM application_document WHERE verification_status = 'PENDING') as pending_documents,
        (SELECT COUNT(*) FROM payment WHERE payment_status = 'SUCCESS') as successful_payments,
        (SELECT COALESCE(SUM(amount), 0) FROM payment WHERE payment_status = 'SUCCESS') as total_disbursed
    `);

    // Application status distribution
    const statusDist = await pool.query(
      `SELECT status, COUNT(*) as count FROM application GROUP BY status`
    );

    // Recent applications
    const recentApps = await pool.query(
      `SELECT a.application_id, a.status, a.submitted_at,
              s.name as student_name, sch.name as scholarship_name
       FROM application a
       JOIN student s ON a.student_id = s.student_id
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       ORDER BY a.updated_at DESC LIMIT 10`
    );

    // Monthly application trend (last 6 months)
    const trend = await pool.query(
      `SELECT TO_CHAR(application_date, 'YYYY-MM') as month, COUNT(*) as count
       FROM application
       WHERE application_date > NOW() - INTERVAL '6 months'
       GROUP BY month ORDER BY month`
    );

    res.json({
      stats: stats.rows[0],
      statusDistribution: statusDist.rows,
      recentApplications: recentApps.rows,
      monthlyTrend: trend.rows,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// SCHOLARSHIP MANAGEMENT
// ============================================================
async function createScholarship(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, description, amount, status, deadline } = req.body;

    const result = await client.query(
      `INSERT INTO scholarship (name, description, amount, status, deadline)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description, amount, status || 'ACTIVE', deadline]
    );

    await client.query('COMMIT');

    // Audit
    try {
      const db = getDb();
      await db.collection('audit_events').insertOne({
        actor_id: req.user.id,
        actor_role: req.user.role,
        action: 'SCHOLARSHIP_CREATED',
        resource_type: 'scholarship',
        resource_id: result.rows[0].scholarship_id,
        details: { name },
        timestamp: new Date(),
        correlation_id: req.correlationId,
      });
    } catch (e) { logger.warn('Audit log failed', { error: e.message }); }

    res.status(201).json({ message: 'Scholarship created', scholarship: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function updateScholarship(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, amount, status, deadline } = req.body;

    const result = await pool.query(
      `UPDATE scholarship
       SET name = COALESCE($1, name), description = COALESCE($2, description),
           amount = COALESCE($3, amount), status = COALESCE($4, status),
           deadline = COALESCE($5, deadline)
       WHERE scholarship_id = $6 RETURNING *`,
      [name, description, amount, status, deadline, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scholarship not found' });
    }

    try {
      const db = getDb();
      await db.collection('audit_events').insertOne({
        actor_id: req.user.id, actor_role: req.user.role,
        action: 'SCHOLARSHIP_UPDATED', resource_type: 'scholarship', resource_id: parseInt(id),
        details: { name, status }, timestamp: new Date(), correlation_id: req.correlationId,
      });
    } catch (e) { logger.warn('Audit log failed'); }

    res.json({ message: 'Scholarship updated', scholarship: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function getAllScholarshipsAdmin(req, res, next) {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let idx = 0;

    if (search) { idx++; conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); params.push(`%${search}%`); }
    if (status) { idx++; conditions.push(`status = $${idx}`); params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM scholarship ${where}`, params);

    idx++; params.push(parseInt(limit));
    idx++; params.push(offset);
    const result = await pool.query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM application a WHERE a.scholarship_id = s.scholarship_id) as application_count
       FROM scholarship s ${where}
       ORDER BY s.created_at DESC LIMIT $${idx-1} OFFSET $${idx}`,
      params
    );

    res.json({
      scholarships: result.rows,
      pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// ELIGIBILITY CRITERIA MANAGEMENT
// ============================================================
async function upsertEligibilityCriteria(req, res, next) {
  try {
    const { id } = req.params; // scholarship_id
    const { minimum_cgpa, maximum_income, eligible_course, eligible_category, minimum_age, maximum_age } = req.body;

    const result = await pool.query(
      `INSERT INTO eligibility_criteria (scholarship_id, minimum_cgpa, maximum_income, eligible_course, eligible_category, minimum_age, maximum_age)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (scholarship_id) DO UPDATE SET
         minimum_cgpa = COALESCE($2, eligibility_criteria.minimum_cgpa),
         maximum_income = COALESCE($3, eligibility_criteria.maximum_income),
         eligible_course = COALESCE($4, eligibility_criteria.eligible_course),
         eligible_category = COALESCE($5, eligibility_criteria.eligible_category),
         minimum_age = COALESCE($6, eligibility_criteria.minimum_age),
         maximum_age = COALESCE($7, eligibility_criteria.maximum_age)
       RETURNING *`,
      [id, minimum_cgpa, maximum_income, eligible_course || null, eligible_category || null, minimum_age, maximum_age]
    );

    res.json({ message: 'Eligibility criteria updated', criteria: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function getEligibilityCriteria(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM eligibility_criteria WHERE scholarship_id = $1', [id]
    );
    res.json({ criteria: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// REQUIRED DOCUMENTS MANAGEMENT
// ============================================================
async function addRequiredDocument(req, res, next) {
  try {
    const { id } = req.params;
    const { document_name, mandatory } = req.body;
    const result = await pool.query(
      `INSERT INTO required_document (scholarship_id, document_name, mandatory)
       VALUES ($1, $2, $3) RETURNING *`,
      [id, document_name, mandatory !== false]
    );
    res.status(201).json({ message: 'Required document added', document: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function deleteRequiredDocument(req, res, next) {
  try {
    const { docId } = req.params;
    const result = await pool.query(
      'DELETE FROM required_document WHERE requirement_id = $1 RETURNING *', [docId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document requirement not found' });
    res.json({ message: 'Required document removed' });
  } catch (err) {
    next(err);
  }
}

async function getRequiredDocuments(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM required_document WHERE scholarship_id = $1 ORDER BY mandatory DESC, document_name', [id]
    );
    res.json({ documents: result.rows });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// STUDENT MANAGEMENT
// ============================================================
async function getAllStudents(req, res, next) {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '';
    const params = [];
    let idx = 0;

    if (search) {
      idx++; where = `WHERE (s.name ILIKE $${idx} OR s.email ILIKE $${idx})`; params.push(`%${search}%`);
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM student s ${where}`, params);
    idx++; params.push(parseInt(limit)); idx++; params.push(offset);

    const result = await pool.query(
      `SELECT s.student_id, s.name, s.email, s.phone, s.date_of_birth, s.gender, s.created_at,
              sp.category, sp.annual_income, sp.state, sp.city,
              (SELECT COUNT(*) FROM application a WHERE a.student_id = s.student_id) as application_count
       FROM student s
       LEFT JOIN student_profile sp ON s.student_id = sp.student_id
       ${where}
       ORDER BY s.created_at DESC LIMIT $${idx-1} OFFSET $${idx}`,
      params
    );

    res.json({ students: result.rows, pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page) } });
  } catch (err) {
    next(err);
  }
}

async function getStudentDetail(req, res, next) {
  try {
    const { id } = req.params;

    const student = await pool.query(
      `SELECT s.student_id, s.name, s.email, s.phone, s.date_of_birth, s.gender, s.address, s.created_at,
              sp.category, sp.annual_income, sp.family_size, sp.state, sp.city
       FROM student s
       LEFT JOIN student_profile sp ON s.student_id = sp.student_id
       WHERE s.student_id = $1`, [id]
    );

    if (student.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    const academics = await pool.query('SELECT * FROM academic_details WHERE student_id = $1', [id]);

    const applications = await pool.query(
      `SELECT a.*, sch.name as scholarship_name, r.name as reviewer_name
       FROM application a
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       LEFT JOIN reviewer r ON a.reviewer_id = r.reviewer_id
       WHERE a.student_id = $1 ORDER BY a.updated_at DESC`, [id]
    );

    res.json({ student: student.rows[0], academics: academics.rows, applications: applications.rows });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// APPLICATION MANAGEMENT (Admin)
// ============================================================
async function getAllApplications(req, res, next) {
  try {
    const { search, status, scholarship_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let idx = 0;

    if (search) {
      idx++; conditions.push(`(s.name ILIKE $${idx} OR s.email ILIKE $${idx} OR CAST(a.application_id AS TEXT) LIKE $${idx})`);
      params.push(`%${search}%`);
    }
    if (status) { idx++; conditions.push(`a.status = $${idx}`); params.push(status); }
    if (scholarship_id) { idx++; conditions.push(`a.scholarship_id = $${idx}`); params.push(scholarship_id); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM application a
       JOIN student s ON a.student_id = s.student_id
       ${where}`, params
    );

    idx++; params.push(parseInt(limit)); idx++; params.push(offset);

    const result = await pool.query(
      `SELECT a.*, s.name as student_name, s.email as student_email,
              sch.name as scholarship_name, sch.amount as scholarship_amount,
              r.name as reviewer_name, r.designation as reviewer_designation,
              (SELECT COUNT(*) FROM application_document ad WHERE ad.application_id = a.application_id) as doc_count,
              (SELECT COUNT(*) FROM application_document ad WHERE ad.application_id = a.application_id AND ad.verification_status = 'VERIFIED') as verified_doc_count
       FROM application a
       JOIN student s ON a.student_id = s.student_id
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       LEFT JOIN reviewer r ON a.reviewer_id = r.reviewer_id
       ${where}
       ORDER BY a.updated_at DESC LIMIT $${idx-1} OFFSET $${idx}`,
      params
    );

    res.json({
      applications: result.rows,
      pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function changeApplicationStatus(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, comment, reviewer_id } = req.body;

    await client.query('BEGIN');

    // Get current status
    const current = await client.query('SELECT * FROM application WHERE application_id = $1', [id]);
    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = current.rows[0];
    const oldStatus = app.status;

    // Validate state transition
    const validTransitions = {
      SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
      UNDER_REVIEW: ['CORRECTION_REQUIRED', 'APPROVED', 'REJECTED'],
      CORRECTION_REQUIRED: ['UNDER_REVIEW', 'REJECTED'],
      DRAFT: ['SUBMITTED'],
    };

    if (!validTransitions[oldStatus] || !validTransitions[oldStatus].includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Cannot transition from ${oldStatus} to ${status}`,
        allowed: validTransitions[oldStatus] || [],
      });
    }

    // Update application
    const updates = { status, updated_at: 'NOW()' };
    if (reviewer_id) {
      await client.query(
        'UPDATE application SET status = $1, reviewer_id = $2, updated_at = NOW() WHERE application_id = $3',
        [status, reviewer_id, id]
      );
    } else {
      await client.query(
        'UPDATE application SET status = $1, updated_at = NOW() WHERE application_id = $2',
        [status, id]
      );
    }

    // Record status change
    const changedBy = `${req.user.role}:${req.user.id}`;
    await client.query(
      `INSERT INTO application_status (application_id, status, comment, changed_by)
       VALUES ($1, $2, $3, $4)`,
      [id, status, comment || null, changedBy]
    );

    if (status === 'APPROVED') {
      const grantRes = await client.query(
        'SELECT grant_id FROM grant_record WHERE scholarship_id = $1 LIMIT 1',
        [app.scholarship_id]
      );
      let grantId = grantRes.rows[0]?.grant_id;
      if (!grantId) {
        const schInfo = await client.query('SELECT name, amount FROM scholarship WHERE scholarship_id = $1', [app.scholarship_id]);
        const newGrant = await client.query(
          `INSERT INTO grant_record (scholarship_id, grant_name, amount, status)
           VALUES ($1, $2, $3, 'ACTIVE') RETURNING grant_id`,
          [app.scholarship_id, `${schInfo.rows[0]?.name || 'Scholarship'} Grant`, schInfo.rows[0]?.amount || 50000]
        );
        grantId = newGrant.rows[0]?.grant_id;
      }
      if (grantId) {
        await client.query('UPDATE application SET grant_id = $1 WHERE application_id = $2', [grantId, id]);
      }
    }

    // Create student notification
    const notifMap = {
      UNDER_REVIEW: { title: 'Application Under Review', type: 'INFO', msg: 'is now under review.' },
      CORRECTION_REQUIRED: { title: 'Correction Required', type: 'WARNING', msg: 'requires corrections.' },
      APPROVED: { title: 'Application Approved', type: 'SUCCESS', msg: 'has been approved! Congratulations!' },
      REJECTED: { title: 'Application Rejected', type: 'ERROR', msg: 'has been rejected.' },
    };

    if (notifMap[status]) {
      const schName = await client.query(
        'SELECT name FROM scholarship WHERE scholarship_id = $1', [app.scholarship_id]
      );
      const scholarshipName = schName.rows[0]?.name || 'Unknown';
      const n = notifMap[status];
      const fullMsg = comment
        ? `Your application for ${scholarshipName} ${n.msg} Comment: ${comment}`
        : `Your application for ${scholarshipName} ${n.msg}`;

      await client.query(
        `INSERT INTO notification (student_id, title, message, type, reference_type, reference_id)
         VALUES ($1, $2, $3, $4, 'APPLICATION', $5)`,
        [app.student_id, n.title, fullMsg, n.type, parseInt(id)]
      );
    }

    await client.query('COMMIT');

    // Audit log
    try {
      const db = getDb();
      await db.collection('audit_events').insertOne({
        actor_id: req.user.id, actor_role: req.user.role,
        action: 'APPLICATION_STATUS_CHANGED',
        resource_type: 'application', resource_id: parseInt(id),
        details: { from_status: oldStatus, to_status: status, comment },
        timestamp: new Date(), correlation_id: req.correlationId,
      });
    } catch (e) { logger.warn('Audit log failed'); }

    res.json({ message: `Application status changed to ${status}` });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function assignReviewer(req, res, next) {
  try {
    const { id } = req.params;
    const { reviewer_id } = req.body;

    // Verify reviewer exists
    const rev = await pool.query('SELECT reviewer_id, name FROM reviewer WHERE reviewer_id = $1', [reviewer_id]);
    if (rev.rows.length === 0) return res.status(404).json({ error: 'Reviewer not found' });

    await pool.query(
      'UPDATE application SET reviewer_id = $1, updated_at = NOW() WHERE application_id = $2',
      [reviewer_id, id]
    );

    try {
      const db = getDb();
      await db.collection('audit_events').insertOne({
        actor_id: req.user.id, actor_role: req.user.role,
        action: 'REVIEWER_ASSIGNED', resource_type: 'application', resource_id: parseInt(id),
        details: { reviewer_id, reviewer_name: rev.rows[0].name },
        timestamp: new Date(), correlation_id: req.correlationId,
      });
    } catch (e) { logger.warn('Audit log failed'); }

    res.json({ message: 'Reviewer assigned successfully' });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// DOCUMENT VERIFICATION
// ============================================================
async function verifyDocument(req, res, next) {
  try {
    const { docId } = req.params;
    const { verification_status, reviewer_comment } = req.body;

    if (!['VERIFIED', 'REJECTED'].includes(verification_status)) {
      return res.status(400).json({ error: 'Invalid verification status' });
    }

    const result = await pool.query(
      `UPDATE application_document
       SET verification_status = $1, reviewer_comment = $2,
           verified_by = $3, verified_at = NOW()
       WHERE application_document_id = $4 RETURNING *`,
      [verification_status, reviewer_comment || null, req.user.id, docId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found' });

    // Notification for rejected document
    if (verification_status === 'REJECTED') {
      const appDoc = result.rows[0];
      const appRes = await pool.query(
        `SELECT a.student_id, a.application_id, sch.name as scholarship_name, rd.document_name
         FROM application a
         JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
         JOIN application_document ad ON ad.application_id = a.application_id
         JOIN required_document rd ON ad.requirement_id = rd.requirement_id
         WHERE ad.application_document_id = $1`,
        [docId]
      );
      if (appRes.rows.length > 0) {
        const r = appRes.rows[0];
        await pool.query(
          `INSERT INTO notification (student_id, title, message, type, reference_type, reference_id)
           VALUES ($1, 'Document Rejected', $2, 'ERROR', 'APPLICATION', $3)`,
          [r.student_id, `Your ${r.document_name} for ${r.scholarship_name} was rejected. ${reviewer_comment || ''}`, r.application_id]
        );
      }
    }

    try {
      const db = getDb();
      await db.collection('audit_events').insertOne({
        actor_id: req.user.id, actor_role: req.user.role,
        action: verification_status === 'VERIFIED' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
        resource_type: 'application_document', resource_id: parseInt(docId),
        details: { verification_status, reviewer_comment },
        timestamp: new Date(), correlation_id: req.correlationId,
      });
    } catch (e) { logger.warn('Audit log failed'); }

    res.json({ message: `Document ${verification_status.toLowerCase()}`, document: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function getPendingDocuments(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM application_document WHERE verification_status = 'PENDING'`
    );

    const result = await pool.query(
      `SELECT ad.*, rd.document_name, rd.mandatory,
              a.application_id, a.status as application_status,
              s.name as student_name, sch.name as scholarship_name,
              rev.name as verified_by_name
       FROM application_document ad
       JOIN required_document rd ON ad.requirement_id = rd.requirement_id
       JOIN application a ON ad.application_id = a.application_id
       JOIN student s ON a.student_id = s.student_id
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       LEFT JOIN reviewer rev ON ad.verified_by = rev.reviewer_id
       WHERE ad.verification_status = 'PENDING'
       ORDER BY ad.uploaded_at ASC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    res.json({
      documents: result.rows,
      pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page) },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// REVIEWER MANAGEMENT
// ============================================================
async function getAllReviewers(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT reviewer_id, name, email, department, designation, status, created_at,
              (SELECT COUNT(*) FROM application a WHERE a.reviewer_id = r.reviewer_id) as assigned_count
       FROM reviewer r
       ORDER BY created_at DESC`
    );
    res.json({ reviewers: result.rows });
  } catch (err) {
    next(err);
  }
}

async function createReviewer(req, res, next) {
  try {
    const { name, email, password, department, designation } = req.body;

    const existing = await pool.query('SELECT reviewer_id FROM reviewer WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO reviewer (name, email, password_hash, department, designation)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING reviewer_id, name, email, department, designation, status, created_at`,
      [name, email, hash, department, designation]
    );

    res.status(201).json({ message: 'Reviewer created', reviewer: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function updateReviewer(req, res, next) {
  try {
    const { id } = req.params;
    const { name, department, designation, status } = req.body;

    const result = await pool.query(
      `UPDATE reviewer
       SET name = COALESCE($1, name), department = COALESCE($2, department),
           designation = COALESCE($3, designation), status = COALESCE($4, status)
       WHERE reviewer_id = $5
       RETURNING reviewer_id, name, email, department, designation, status`,
      [name, department, designation, status, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Reviewer not found' });
    res.json({ message: 'Reviewer updated', reviewer: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// PAYMENT MANAGEMENT
// ============================================================
async function getAllPayments(req, res, next) {
  try {
    const { status: payStatus, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '';
    const params = [];
    let idx = 0;

    if (payStatus) { idx++; where = `WHERE p.payment_status = $${idx}`; params.push(payStatus); }

    const countRes = await pool.query(`SELECT COUNT(*) FROM payment p ${where}`, params);
    idx++; params.push(parseInt(limit)); idx++; params.push(offset);

    const result = await pool.query(
      `SELECT p.*, a.application_id, a.student_id, a.scholarship_id,
              s.name as student_name, sch.name as scholarship_name
       FROM payment p
       JOIN application a ON p.application_id = a.application_id
       JOIN student s ON a.student_id = s.student_id
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       ${where}
       ORDER BY p.created_at DESC LIMIT $${idx-1} OFFSET $${idx}`,
      params
    );

    res.json({ payments: result.rows, pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page) } });
  } catch (err) {
    next(err);
  }
}

async function createPayment(req, res, next) {
  const client = await pool.connect();
  try {
    const { application_id, amount, payment_status, transaction_id, payment_date } = req.body;

    await client.query('BEGIN');

    // Verify application is approved
    const appCheck = await client.query(
      "SELECT * FROM application WHERE application_id = $1 AND status = 'APPROVED'",
      [application_id]
    );
    if (appCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Can only create payment for approved applications' });
    }

    // Check duplicate transaction_id
    const txnCheck = await client.query('SELECT payment_id FROM payment WHERE transaction_id = $1', [transaction_id]);
    if (txnCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Duplicate transaction ID' });
    }

    const result = await client.query(
      `INSERT INTO payment (application_id, amount, payment_status, status, transaction_id, transaction_reference, payment_date)
       VALUES ($1, $2, $3, $3, $4, $4, COALESCE($5, CURRENT_DATE)) RETURNING *`,
      [application_id, amount, payment_status || 'PAID', transaction_id, payment_date]
    );

    // Notification
    const app = appCheck.rows[0];
    const schRes = await client.query('SELECT name FROM scholarship WHERE scholarship_id = $1', [app.scholarship_id]);
    await client.query(
      `INSERT INTO notification (student_id, title, message, type, reference_type, reference_id)
       VALUES ($1, 'Disbursement Update', $2, 'INFO', 'PAYMENT', $3)`,
      [app.student_id, `A disbursement of ₹${amount} for ${schRes.rows[0]?.name || 'scholarship'} has been initiated. Transaction ID: ${transaction_id}`, result.rows[0].payment_id]
    );

    await client.query('COMMIT');

    try {
      const db = getDb();
      await db.collection('audit_events').insertOne({
        actor_id: req.user.id, actor_role: req.user.role,
        action: 'PAYMENT_CREATED', resource_type: 'payment', resource_id: result.rows[0].payment_id,
        details: { transaction_id, amount, payment_status: payment_status || 'PENDING' },
        timestamp: new Date(), correlation_id: req.correlationId,
      });
    } catch (e) { logger.warn('Audit log failed'); }

    res.status(201).json({ message: 'Payment record created', payment: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function updatePaymentStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    const result = await pool.query(
      'UPDATE payment SET payment_status = $1, status = $1 WHERE payment_id = $2 RETURNING *',
      [payment_status, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });

    try {
      const db = getDb();
      await db.collection('audit_events').insertOne({
        actor_id: req.user.id, actor_role: req.user.role,
        action: 'PAYMENT_STATUS_UPDATED', resource_type: 'payment', resource_id: parseInt(id),
        details: { payment_status }, timestamp: new Date(), correlation_id: req.correlationId,
      });
    } catch (e) { logger.warn('Audit log failed'); }

    res.json({ message: 'Payment status updated', payment: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// AUDIT LOG
// ============================================================
async function getAuditEvents(req, res, next) {
  try {
    const { action, actor_role, page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    if (action) filter.action = action;
    if (actor_role) filter.actor_role = actor_role;

    const db = getDb();
    const total = await db.collection('audit_events').countDocuments(filter);
    const events = await db.collection('audit_events')
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    res.json({ events, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  createScholarship, updateScholarship, getAllScholarshipsAdmin,
  upsertEligibilityCriteria, getEligibilityCriteria,
  addRequiredDocument, deleteRequiredDocument, getRequiredDocuments,
  getAllStudents, getStudentDetail,
  getAllApplications, changeApplicationStatus, assignReviewer,
  verifyDocument, getPendingDocuments,
  getAllReviewers, createReviewer, updateReviewer,
  getAllPayments, createPayment, updatePaymentStatus,
  getAuditEvents,
};
