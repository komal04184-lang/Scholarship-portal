const { query, getClient } = require('../config/database');

class ApplicationPostgresModel {
  /**
   * Check for duplicate application
   */
  static async findExisting(studentId, scholarshipId) {
    const res = await query(
      `SELECT application_id, status FROM application WHERE student_id = $1 AND scholarship_id = $2`,
      [studentId, scholarshipId]
    );
    return res.rows[0] || null;
  }

  /**
   * Create new application in PostgreSQL
   */
  static async create({ studentId, scholarshipId, statement, sop }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const appRes = await client.query(
        `INSERT INTO application (student_id, scholarship_id, status, statement, sop, application_date, submitted_at, updated_at)
         VALUES ($1, $2, 'SUBMITTED', $3, $4, CURRENT_DATE, NOW(), NOW())
         RETURNING *`,
        [studentId, scholarshipId, statement || null, sop || statement || null]
      );
      const app = appRes.rows[0];

      // Insert initial status history
      await client.query(
        `INSERT INTO application_status (application_id, status, comment, changed_by, changed_at)
         VALUES ($1, 'SUBMITTED', $2, 'STUDENT', NOW())`,
        [app.application_id, statement || 'Application submitted online']
      );

      await client.query('COMMIT');
      return app;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Find application by ID
   */
  static async findById(id) {
    const res = await query(
      `SELECT a.*,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'application_document_id', ad.application_document_id,
                  'requirement_id', ad.requirement_id,
                  'document_id', ad.document_id,
                  'document_name', ad.document_name,
                  'original_name', ad.original_name,
                  'document_path', ad.document_path,
                  'mime_type', ad.mime_type,
                  'file_size', ad.file_size,
                  'verification_status', ad.verification_status,
                  'reviewer_comment', ad.reviewer_comment,
                  'uploaded_at', ad.uploaded_at
                )) FROM application_document ad WHERE ad.application_id = a.application_id),
                '[]'::json
              ) as documents
       FROM application a
       WHERE a.application_id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  /**
   * Find all applications for a student
   */
  static async findByStudentId(studentId) {
    const res = await query(
      `SELECT a.*,
              (SELECT COUNT(*) FROM application_document ad WHERE ad.application_id = a.application_id) as document_count
       FROM application a
       WHERE a.student_id = $1
       ORDER BY a.updated_at DESC`,
      [studentId]
    );
    return res.rows;
  }

  /**
   * List applications with filtering, search, and pagination (Admin/Reviewer)
   */
  static async findAll({ status, scholarshipId, search, limit = 20, offset = 0 } = {}) {
    const conditions = [];
    const params = [];
    let idx = 0;

    if (status && status !== 'ALL') {
      idx++;
      conditions.push(`a.status = $${idx}`);
      params.push(status);
    }

    if (scholarshipId) {
      idx++;
      conditions.push(`a.scholarship_id = $${idx}`);
      params.push(scholarshipId);
    }

    if (search) {
      idx++;
      conditions.push(`(CAST(a.application_id AS TEXT) LIKE $${idx} OR CAST(a.student_id AS TEXT) LIKE $${idx})`);
      params.push(`%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM application a ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    idx++; params.push(limit);
    idx++; params.push(offset);

    const dataRes = await query(
      `SELECT a.*,
              (SELECT COUNT(*) FROM application_document ad WHERE ad.application_id = a.application_id) as document_count,
              (SELECT COUNT(*) FROM application_document ad WHERE ad.application_id = a.application_id AND ad.verification_status = 'VERIFIED') as verified_doc_count
       FROM application a
       ${where}
       ORDER BY a.updated_at DESC
       LIMIT $${idx - 1} OFFSET $${idx}`,
      params
    );

    return { total, applications: dataRes.rows };
  }

  /**
   * Update allowed fields of an application (e.g. statement / SOP)
   */
  static async update(applicationId, { statement, sop }) {
    const updates = [];
    const params = [];
    let idx = 0;

    if (statement !== undefined) {
      idx++;
      updates.push(`statement = $${idx}`);
      params.push(statement);
    }

    if (sop !== undefined) {
      idx++;
      updates.push(`sop = $${idx}`);
      params.push(sop);
    }

    // updated_at uses NOW() — no bound parameter needed
    updates.push(`updated_at = NOW()`);

    idx++;
    params.push(applicationId);

    const res = await query(
      `UPDATE application SET ${updates.join(', ')} WHERE application_id = $${idx} RETURNING *`,
      params
    );
    return res.rows[0] || null;
  }

  /**
   * Update application status and log history atomically
   */
  static async updateStatus(applicationId, { newStatus, comment, changedBy = 'SYSTEM', reviewerId = null }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      let appRes;
      if (reviewerId) {
        appRes = await client.query(
          `UPDATE application SET status = $1, reviewer_id = $2, updated_at = NOW() WHERE application_id = $3 RETURNING *`,
          [newStatus, reviewerId, applicationId]
        );
      } else {
        appRes = await client.query(
          `UPDATE application SET status = $1, updated_at = NOW() WHERE application_id = $2 RETURNING *`,
          [newStatus, applicationId]
        );
      }

      const updatedApp = appRes.rows[0];

      // Add status history entry
      await client.query(
        `INSERT INTO application_status (application_id, status, comment, changed_by, changed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [applicationId, newStatus, comment || null, changedBy]
      );

      await client.query('COMMIT');
      return updatedApp;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Add status history entry
   */
  static async addStatusHistory(applicationId, status, comment, changedBy = 'SYSTEM') {
    const res = await query(
      `INSERT INTO application_status (application_id, status, comment, changed_by, changed_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [applicationId, status, comment || null, changedBy]
    );
    return res.rows[0];
  }

  /**
   * Get status history for an application
   */
  static async getStatusHistory(applicationId) {
    const res = await query(
      `SELECT status_id, application_id, status, comment, changed_by, changed_at
       FROM application_status
       WHERE application_id = $1
       ORDER BY changed_at ASC, status_id ASC`,
      [applicationId]
    );
    return res.rows;
  }

  /**
   * Save or update an uploaded document reference
   */
  static async saveDocument({ applicationId, requirementId, documentPath, originalName, documentName, mimeType, fileSize }) {
    const existing = await query(
      `SELECT application_document_id FROM application_document WHERE application_id = $1 AND requirement_id = $2`,
      [applicationId, requirementId || 1]
    );

    if (existing.rows.length > 0) {
      const res = await query(
        `UPDATE application_document
         SET document_path = $1, original_name = $2, document_name = $3, mime_type = $4, file_size = $5,
             verification_status = 'PENDING', reviewer_comment = NULL, verified_by = NULL, verified_at = NULL,
             uploaded_at = NOW()
         WHERE application_id = $6 AND requirement_id = $7
         RETURNING *`,
        [documentPath, originalName, documentName || originalName, mimeType, fileSize, applicationId, requirementId || 1]
      );
      return res.rows[0];
    } else {
      const res = await query(
        `INSERT INTO application_document (application_id, requirement_id, document_id, document_name, original_name, document_path, mime_type, file_size, verification_status, uploaded_at)
         VALUES ($1, $2, $2, $3, $4, $5, $6, $7, 'PENDING', NOW())
         RETURNING *`,
        [applicationId, requirementId || 1, documentName || originalName, originalName, documentPath, mimeType, fileSize]
      );
      return res.rows[0];
    }
  }

  /**
   * Get documents for an application
   */
  static async getDocumentsByApplicationId(applicationId) {
    const res = await query(
      `SELECT * FROM application_document WHERE application_id = $1 ORDER BY uploaded_at DESC`,
      [applicationId]
    );
    return res.rows;
  }

  /**
   * Get document by ID
   */
  static async getDocumentById(docId) {
    const res = await query(
      `SELECT ad.*, a.student_id
       FROM application_document ad
       JOIN application a ON ad.application_id = a.application_id
       WHERE ad.application_document_id = $1 OR ad.document_id = $1`,
      [docId]
    );
    return res.rows[0] || null;
  }

  /**
   * Update document verification status
   */
  static async updateDocumentVerification(docId, { verificationStatus, reviewerComment, verifiedBy }) {
    const res = await query(
      `UPDATE application_document
       SET verification_status = $1, reviewer_comment = $2, verified_by = $3, verified_at = NOW()
       WHERE application_document_id = $4 OR document_id = $4
       RETURNING *`,
      [verificationStatus, reviewerComment || null, verifiedBy || null, docId]
    );
    return res.rows[0] || null;
  }
}

module.exports = ApplicationPostgresModel;

