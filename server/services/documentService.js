const DocumentModel = require('../models/documentModel');
const { query } = require('../config/db');
const path = require('path');
const fs = require('fs');

class DocumentService {
  /**
   * Save an uploaded document for an application
   */
  static async uploadDocument({ applicationId, requirementId, file }) {
    if (!file) {
      throw new Error('No file was uploaded');
    }

    const doc = await DocumentModel.createOrUpdate({
      applicationId,
      requirementId: requirementId || 1,
      documentPath: file.filename,
      originalName: file.originalname,
      documentName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    return doc;
  }

  /**
   * Reviewer or Admin verifies or rejects a document
   */
  static async verifyDocument({ documentId, verificationStatus, reviewerComment, verifiedBy }) {
    if (!['VERIFIED', 'REJECTED'].includes(verificationStatus)) {
      throw new Error("Invalid status. Must be 'VERIFIED' or 'REJECTED'");
    }

    const updated = await DocumentModel.updateVerification(documentId, {
      verificationStatus,
      reviewerComment,
      verifiedBy,
    });

    if (!updated) {
      throw new Error('Document not found');
    }

    // If rejected, notify the student
    if (verificationStatus === 'REJECTED') {
      const doc = await DocumentModel.findById(documentId);
      if (doc?.student_id) {
        await query(
          `INSERT INTO notification (student_id, title, message, type, reference_type, reference_id, created_at)
           VALUES ($1, 'Document Rejected', $2, 'ERROR', 'APPLICATION', $3, NOW())`,
          [
            doc.student_id,
            `Your uploaded document (${doc.original_name || 'Document'}) was rejected. Reason: ${reviewerComment || 'Please re-upload a clear copy.'}`,
            doc.application_id,
          ]
        );
      }
    }

    return updated;
  }

  /**
   * Get file path for download
   */
  static async getFilePath(documentId) {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    const uploadsDir = path.join(__dirname, '../uploads');
    const filePath = path.join(uploadsDir, doc.document_path);

    return {
      filePath,
      originalName: doc.original_name,
      mimeType: doc.mime_type,
      doc,
    };
  }
}

module.exports = DocumentService;
