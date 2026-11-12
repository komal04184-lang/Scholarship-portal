const { query, getMongoDb } = require('../config/database');

class DocumentRepository {
  /**
   * Save a document reference in PostgreSQL
   */
  static async saveDocument(docData, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;

    const sql = `
      INSERT INTO application_document (
        application_id,
        requirement_id,
        document_id,
        document_name,
        original_name,
        document_path,
        mime_type,
        file_size,
        verification_status,
        uploaded_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', NOW())
      RETURNING *;
    `;

    const res = await executor(sql, [
      docData.application_id,
      docData.requirement_id || null,
      docData.document_id || null,
      docData.document_name || docData.original_name,
      docData.original_name,
      docData.document_path,
      docData.mime_type,
      docData.file_size,
    ]);

    return res.rows[0];
  }

  /**
   * Find document by ID
   */
  static async findById(documentId) {
    const sql = `
      SELECT * FROM application_document
      WHERE application_document_id::TEXT = $1::TEXT
      LIMIT 1;
    `;
    const res = await query(sql, [String(documentId)]);
    return res.rows[0] || null;
  }

  /**
   * Find all documents attached to an application
   */
  static async findByApplicationId(applicationId) {
    const sql = `
      SELECT * FROM application_document
      WHERE application_id::TEXT = $1::TEXT
      ORDER BY uploaded_at ASC;
    `;
    const res = await query(sql, [String(applicationId)]);
    return res.rows;
  }

  /**
   * Update document verification status
   */
  static async updateVerification(documentId, status, reviewerComment = null, verifiedBy = null, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;
    const sql = `
      UPDATE application_document
      SET verification_status = $1,
          reviewer_comment = $2,
          verified_by = $3,
          verified_at = NOW()
      WHERE application_document_id::TEXT = $4::TEXT
      RETURNING *;
    `;
    const res = await executor(sql, [
      status,
      reviewerComment,
      verifiedBy ? String(verifiedBy) : null,
      String(documentId),
    ]);
    return res.rows[0] || null;
  }

  /**
   * Delete document by ID
   */
  static async deleteDocument(documentId, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;
    const sql = `
      DELETE FROM application_document
      WHERE application_document_id::TEXT = $1::TEXT
      RETURNING *;
    `;
    const res = await executor(sql, [String(documentId)]);
    return res.rows[0] || null;
  }

  /**
   * MongoDB Document Metadata
   */
  static async saveMongoMetadata(docId, metadata) {
    const db = getMongoDb();
    if (!db) return null;
    try {
      const col = db.collection('document_metadata');
      await col.updateOne(
        { document_id: String(docId) },
        {
          $set: {
            document_id: String(docId),
            metadata,
            updated_at: new Date(),
          },
        },
        { upsert: true }
      );
      return true;
    } catch (e) {
      return null;
    }
  }

  static async getMongoMetadata(docId) {
    const db = getMongoDb();
    if (!db) return null;
    try {
      const col = db.collection('document_metadata');
      return await col.findOne({ document_id: String(docId) });
    } catch (e) {
      return null;
    }
  }
}

module.exports = DocumentRepository;

