const { pool } = require('../config/database');
const { getDb } = require('../config/mongodb');
const logger = require('../config/logger');

/**
 * POST /api/v1/applications
 * Create a new application (DRAFT or SUBMITTED).
 */
async function createApplication(req, res, next) {
  const client = await pool.connect();
  try {
    const { scholarship_id, statement } = req.body;
    const studentId = req.user.id;

    await client.query('BEGIN');

    // Check scholarship exists and is active
    const schResult = await client.query(
      "SELECT * FROM scholarship WHERE scholarship_id = $1 AND status = 'ACTIVE' AND deadline > NOW()",
      [scholarship_id]
    );
    if (schResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Scholarship is not available for applications' });
    }

    // Check duplicate
    const dupCheck = await client.query(
      'SELECT application_id, status FROM application WHERE student_id = $1 AND scholarship_id = $2',
      [studentId, scholarship_id]
    );
    if (dupCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'You have already applied for this scholarship',
        existing_application_id: dupCheck.rows[0].application_id,
        existing_status: dupCheck.rows[0].status,
      });
    }

    // Create application
    const result = await client.query(
      `INSERT INTO application (student_id, scholarship_id, status, statement, sop, submitted_at, updated_at)
       VALUES ($1, $2, 'SUBMITTED', $3, $3, NOW(), NOW())
       RETURNING *`,
      [studentId, scholarship_id, statement || null]
    );

    const app = result.rows[0];

    // Create initial status history
    await client.query(
      `INSERT INTO application_status (application_id, status, comment, changed_by)
       VALUES ($1, 'SUBMITTED', $2, 'STUDENT')`,
      [app.application_id, statement || 'Application submitted by student']
    );

    // Create notification
    await client.query(
      `INSERT INTO notification (student_id, title, message, type, reference_type, reference_id)
       VALUES ($1, 'Application Submitted', $2, 'INFO', 'APPLICATION', $3)`,
      [studentId, `Your application for ${schResult.rows[0].name} has been submitted successfully.`, app.application_id]
    );

    await client.query('COMMIT');

    // MongoDB snapshot
    try {
      const db = getDb();
      await db.collection('application_snapshots').insertOne({
        application_id: app.application_id,
        student_id: studentId,
        scholarship_id,
        snapshot_date: new Date(),
        status: 'SUBMITTED',
        statement,
      });

      await db.collection('audit_events').insertOne({
        actor_id: studentId,
        actor_role: 'STUDENT',
        action: 'APPLICATION_SUBMITTED',
        resource_type: 'application',
        resource_id: app.application_id,
        timestamp: new Date(),
        correlation_id: req.correlationId,
      });
    } catch (mongoErr) {
      logger.warn('MongoDB logging failed', { error: mongoErr.message });
    }

    logger.info('Application created', { applicationId: app.application_id, studentId, scholarshipId: scholarship_id });
    res.status(201).json({ message: 'Application submitted successfully', application: app });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * GET /api/v1/applications
 * Get student's applications.
 */
async function getMyApplications(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT a.*, sch.name as scholarship_name, sch.amount as scholarship_amount,
              sch.deadline as scholarship_deadline,
              r.name as reviewer_name, r.designation as reviewer_designation
       FROM application a
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       LEFT JOIN reviewer r ON a.reviewer_id = r.reviewer_id
       WHERE a.student_id = $1
       ORDER BY a.updated_at DESC`,
      [req.user.id]
    );
    res.json({ applications: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/applications/:id
 * Get single application with full details.
 */
async function getApplication(req, res, next) {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'REVIEWER';

    let condition = 'a.application_id = $1';
    const params = [id];

    if (!isAdmin) {
      condition += ' AND a.student_id = $2';
      params.push(req.user.id);
    }

    const result = await pool.query(
      `SELECT a.*, sch.name as scholarship_name, sch.amount as scholarship_amount,
              sch.description as scholarship_description, sch.deadline as scholarship_deadline,
              s.name as student_name, s.email as student_email, s.phone as student_phone,
              sp.category, sp.annual_income,
              r.name as reviewer_name, r.designation as reviewer_designation
       FROM application a
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       JOIN student s ON a.student_id = s.student_id
       LEFT JOIN student_profile sp ON s.student_id = sp.student_id
       LEFT JOIN reviewer r ON a.reviewer_id = r.reviewer_id
       WHERE ${condition}`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Get status history
    const history = await pool.query(
      'SELECT * FROM application_status WHERE application_id = $1 ORDER BY changed_at ASC',
      [id]
    );

    // Get documents
    const documents = await pool.query(
      `SELECT ad.*, rd.document_name, rd.mandatory,
              rev.name as verified_by_name
       FROM application_document ad
       JOIN required_document rd ON ad.requirement_id = rd.requirement_id
       LEFT JOIN reviewer rev ON ad.verified_by = rev.reviewer_id
       WHERE ad.application_id = $1
       ORDER BY rd.mandatory DESC`,
      [id]
    );

    // Get required documents for this scholarship
    const requiredDocs = await pool.query(
      'SELECT * FROM required_document WHERE scholarship_id = $1',
      [result.rows[0].scholarship_id]
    );

    // Get payments
    const payments = await pool.query(
      'SELECT * FROM payment WHERE application_id = $1 ORDER BY created_at DESC',
      [id]
    );

    // Get academic details (for admin view)
    let academics = [];
    if (isAdmin) {
      const acRes = await pool.query(
        'SELECT * FROM academic_details WHERE student_id = $1',
        [result.rows[0].student_id]
      );
      academics = acRes.rows;
    }

    res.json({
      application: result.rows[0],
      statusHistory: history.rows,
      documents: documents.rows,
      requiredDocuments: requiredDocs.rows,
      payments: payments.rows,
      academics,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/applications/:id/documents
 * Upload document for application.
 */
async function uploadDocument(req, res, next) {
  try {
    const { id } = req.params;
    const { requirement_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify application ownership
    const appCheck = await pool.query(
      'SELECT application_id FROM application WHERE application_id = $1 AND student_id = $2',
      [id, req.user.id]
    );
    if (appCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check if document for this requirement already exists — allow replacement
    const existing = await pool.query(
      'SELECT application_document_id FROM application_document WHERE application_id = $1 AND requirement_id = $2',
      [id, requirement_id]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE application_document
         SET document_path = $1, original_name = $2, document_name = $2, mime_type = $3, file_size = $4,
             verification_status = 'PENDING', reviewer_comment = NULL, verified_by = NULL, verified_at = NULL,
             uploaded_at = NOW()
         WHERE application_id = $5 AND requirement_id = $6
         RETURNING *`,
        [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, id, requirement_id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO application_document (application_id, requirement_id, document_path, original_name, document_name, mime_type, file_size)
         VALUES ($1, $2, $3, $4, $4, $5, $6)
         RETURNING *`,
        [id, requirement_id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
      );
    }

    res.status(201).json({ message: 'Document uploaded', document: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/applications/:id/documents/:docId/download
 * Download document file securely.
 */
async function downloadDocument(req, res, next) {
  try {
    const { id, docId } = req.params;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'REVIEWER';

    let query = `SELECT ad.document_path, ad.original_name, ad.mime_type
                 FROM application_document ad
                 JOIN application a ON ad.application_id = a.application_id
                 WHERE ad.application_document_id = $1 AND ad.application_id = $2`;
    const params = [docId, id];

    if (!isAdmin) {
      query += ' AND a.student_id = $3';
      params.push(req.user.id);
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];
    const path = require('path');
    const filePath = path.join(__dirname, '../../uploads', doc.document_path);

    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createApplication, getMyApplications, getApplication,
  uploadDocument, downloadDocument,
};
