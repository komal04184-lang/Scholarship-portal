const { query } = require('../config/db');

class DocumentModel {
  static async createOrUpdate({ applicationId, requirementId, documentPath, originalName, documentName, mimeType, fileSize }) {
    // Check if document already exists for this application and requirement
    const existing = await query(
      `SELECT application_document_id FROM application_document WHERE application_id = $1 AND requirement_id = $2`,
      [applicationId, requirementId]
    );

    if (existing.rows.length > 0) {
      const res = await query(
        `UPDATE application_document
         SET document_path = $1, original_name = $2, document_name = $3, mime_type = $4, file_size = $5,
             verification_status = 'PENDING', reviewer_comment = NULL, verified_by = NULL, verified_at = NULL,
             uploaded_at = NOW()
         WHERE application_id = $6 AND requirement_id = $7
         RETURNING *`,
        [documentPath, originalName, documentName || originalName, mimeType, fileSize, applicationId, requirementId]
      );
      return res.rows[0];
    } else {
      const res = await query(
        `INSERT INTO application_document (application_id, requirement_id, document_path, original_name, document_name, mime_type, file_size, verification_status, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', NOW())
         RETURNING *`,
        [applicationId, requirementId, documentPath, originalName, documentName || originalName, mimeType, fileSize]
      );
      return res.rows[0];
    }
  }

  static async findById(id) {
    const res = await query(
      `SELECT ad.*, rd.document_name as requirement_name, rd.mandatory,
              a.student_id, a.scholarship_id, rev.name as reviewer_name
       FROM application_document ad
       LEFT JOIN required_document rd ON ad.requirement_id = rd.requirement_id
       JOIN application a ON ad.application_id = a.application_id
       LEFT JOIN reviewer rev ON ad.verified_by = rev.reviewer_id
       WHERE ad.application_document_id = $1 OR ad.document_id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findByApplicationId(applicationId) {
    const res = await query(
      `SELECT ad.*, rd.document_name as requirement_name, rd.mandatory,
              rev.name as reviewer_name
       FROM application_document ad
       LEFT JOIN required_document rd ON ad.requirement_id = rd.requirement_id
       LEFT JOIN reviewer rev ON ad.verified_by = rev.reviewer_id
       WHERE ad.application_id = $1
       ORDER BY rd.mandatory DESC, ad.uploaded_at DESC`,
      [applicationId]
    );
    return res.rows;
  }

  static async updateVerification(docId, { verificationStatus, reviewerComment, verifiedBy }) {
    const res = await query(
      `UPDATE application_document
       SET verification_status = $1, reviewer_comment = $2, verified_by = $3, verified_at = NOW()
       WHERE application_document_id = $4 OR document_id = $4
       RETURNING *`,
      [verificationStatus, reviewerComment || null, verifiedBy, docId]
    );
    return res.rows[0] || null;
  }

  static async findPending({ limit = 20, offset = 0 } = {}) {
    const countRes = await query(
      `SELECT COUNT(*) as count FROM application_document WHERE verification_status = 'PENDING'`
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const res = await query(
      `SELECT ad.*, rd.document_name as requirement_name, rd.mandatory,
              a.application_id, a.status as application_status,
              s.name as student_name, s.email as student_email,
              sch.name as scholarship_name
       FROM application_document ad
       LEFT JOIN required_document rd ON ad.requirement_id = rd.requirement_id
       JOIN application a ON ad.application_id = a.application_id
       JOIN student s ON a.student_id = s.student_id
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       WHERE ad.verification_status = 'PENDING'
       ORDER BY ad.uploaded_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return { total, documents: res.rows };
  }
}

module.exports = DocumentModel;
