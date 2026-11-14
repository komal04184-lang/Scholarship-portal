const { query } = require('../config/database');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeUuid = (val) => (typeof val === 'string' && UUID_REGEX.test(val) ? val : null);

class DocumentRepository {
  /**
   * Save a document reference in PostgreSQL (application_documents table)
   */
  static async saveDocument(docData, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;

    const sql = `
      INSERT INTO application_documents (
        application_id,
        requirement_id,
        uploaded_by_user_id,
        document_type,
        original_filename,
        storage_key,
        mime_type,
        file_size_bytes,
        checksum_sha256,
        verification_status,
        remarks,
        is_current,
        uploaded_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
      RETURNING *;
    `;

    const res = await executor(sql, [
      docData.application_id,
      safeUuid(docData.requirement_id),
      String(docData.uploaded_by_user_id || docData.student_id || 'UNKNOWN'),
      docData.document_type || docData.document_name || 'Document',
      docData.original_filename || docData.original_name || 'file',
      docData.storage_key || docData.document_path,
      docData.mime_type || 'application/octet-stream',
      docData.file_size_bytes || docData.file_size || 0,
      docData.checksum_sha256 || null,
      docData.verification_status || 'PENDING',
      docData.remarks || null,
    ]);

    const row = res.rows[0];
    if (row) {
      // Compatibility aliases
      row.application_document_id = row.id;
      row.document_name = row.document_type || row.original_filename;
      row.document_path = row.storage_key;
      row.file_size = row.file_size_bytes;
    }
    return row;
  }

  /**
   * Find document by ID
   */
  static async findById(documentId) {
    const sql = `
      SELECT d.*, 
             d.id AS application_document_id,
             d.storage_key AS document_path,
             d.document_type AS document_name,
             d.file_size_bytes AS file_size
      FROM application_documents d
      WHERE d.id::TEXT = $1::TEXT
      LIMIT 1;
    `;
    const res = await query(sql, [String(documentId)]);
    return res.rows[0] || null;
  }

  /**
   * Find all active documents attached to an application
   */
  static async findByApplicationId(applicationId) {
    const sql = `
      SELECT d.*,
             d.id AS application_document_id,
             d.storage_key AS document_path,
             d.document_type AS document_name,
             d.file_size_bytes AS file_size
      FROM application_documents d
      WHERE d.application_id::TEXT = $1::TEXT AND d.is_current = true
      ORDER BY d.uploaded_at ASC;
    `;
    const res = await query(sql, [String(applicationId)]);
    return res.rows;
  }

  /**
   * Replace an existing document with a new upload version
   */
  static async replaceDocument(documentId, newDocData, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;

    // 1. Mark existing document as inactive
    const markOldSql = `
      UPDATE application_documents
      SET is_current = false
      WHERE id::TEXT = $1::TEXT
      RETURNING *;
    `;
    const oldRes = await executor(markOldSql, [String(documentId)]);
    const oldDoc = oldRes.rows[0];

    // 2. Insert new current document
    const insertSql = `
      INSERT INTO application_documents (
        application_id,
        requirement_id,
        uploaded_by_user_id,
        document_type,
        original_filename,
        storage_key,
        mime_type,
        file_size_bytes,
        checksum_sha256,
        verification_status,
        remarks,
        is_current,
        uploaded_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', $10, true, NOW())
      RETURNING *;
    `;

    const res = await executor(insertSql, [
      oldDoc ? oldDoc.application_id : newDocData.application_id,
      oldDoc ? oldDoc.requirement_id : (newDocData.requirement_id || null),
      String(newDocData.uploaded_by_user_id || (oldDoc ? oldDoc.uploaded_by_user_id : 'UNKNOWN')),
      newDocData.document_type || (oldDoc ? oldDoc.document_type : 'Document'),
      newDocData.original_filename,
      newDocData.storage_key,
      newDocData.mime_type,
      newDocData.file_size_bytes,
      newDocData.checksum_sha256 || null,
      `Replaced previous version of ${oldDoc ? oldDoc.original_filename : 'document'}`,
    ]);

    const row = res.rows[0];
    if (row) {
      row.application_document_id = row.id;
      row.document_name = row.document_type || row.original_filename;
      row.document_path = row.storage_key;
      row.file_size = row.file_size_bytes;
    }
    return row;
  }

  /**
   * Update document verification status
   */
  static async updateVerification(documentId, status, reviewerComment = null, verifiedBy = null, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;
    const sql = `
      UPDATE application_documents
      SET verification_status = $1,
          remarks = COALESCE($2, remarks)
      WHERE id::TEXT = $3::TEXT
      RETURNING *,
                id AS application_document_id,
                storage_key AS document_path,
                document_type AS document_name,
                file_size_bytes AS file_size;
    `;
    const res = await executor(sql, [
      status,
      reviewerComment,
      String(documentId),
    ]);
    return res.rows[0] || null;
  }

  /**
   * Delete document by ID (soft delete or hard delete)
   */
  static async deleteDocument(documentId, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;
    const sql = `
      UPDATE application_documents
      SET is_current = false
      WHERE id::TEXT = $1::TEXT
      RETURNING *;
    `;
    const res = await executor(sql, [String(documentId)]);
    return res.rows[0] || null;
  }
}

module.exports = DocumentRepository;
