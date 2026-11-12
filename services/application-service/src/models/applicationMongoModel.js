const { getDb } = require('../config/mongodb');
const logger = require('../config/logger');

class ApplicationMongoModel {
  /**
   * Save submission snapshot in MongoDB
   */
  static async saveSnapshot({ applicationId, studentId, scholarshipId, payload, scholarshipContext, studentContext }) {
    try {
      const db = getDb();
      if (!db) return null;

      const collection = db.collection('application_snapshots');
      const doc = {
        application_id: String(applicationId),
        student_id: String(studentId),
        scholarship_id: String(scholarshipId),
        submission_payload: payload,
        scholarship_context: scholarshipContext || {},
        student_context: studentContext || {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      await collection.updateOne(
        { application_id: String(applicationId) },
        { $set: doc },
        { upsert: true }
      );
      return doc;
    } catch (err) {
      logger.warn(`Failed to save MongoDB snapshot for application #${applicationId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Retrieve snapshot by application ID
   */
  static async getSnapshot(applicationId) {
    try {
      const db = getDb();
      if (!db) return null;

      const collection = db.collection('application_snapshots');
      return await collection.findOne({ application_id: String(applicationId) });
    } catch (err) {
      logger.warn(`Failed to read MongoDB snapshot for application #${applicationId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Save rich document metadata in MongoDB
   */
  static async saveDocumentMetadata({ applicationId, documentId, originalName, mimeType, size, path, extraMeta = {} }) {
    try {
      const db = getDb();
      if (!db) return null;

      const collection = db.collection('document_metadata');
      const doc = {
        application_id: String(applicationId),
        document_id: String(documentId),
        original_name: originalName,
        mime_type: mimeType,
        size_bytes: size,
        storage_path: path,
        uploaded_at: new Date(),
        extra_metadata: extraMeta,
      };

      await collection.insertOne(doc);
      return doc;
    } catch (err) {
      logger.warn(`Failed to save MongoDB document metadata for doc #${documentId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Get document metadata from MongoDB
   */
  static async getDocumentMetadata(documentId) {
    try {
      const db = getDb();
      if (!db) return null;

      const collection = db.collection('document_metadata');
      return await collection.findOne({ document_id: String(documentId) });
    } catch (err) {
      logger.warn(`Failed to read MongoDB document metadata for doc #${documentId}: ${err.message}`);
      return null;
    }
  }
}

module.exports = ApplicationMongoModel;

