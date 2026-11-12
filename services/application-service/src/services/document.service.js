const fs = require('fs');
const path = require('path');
const DocumentRepository = require('../repositories/document.repository');
const env = require('../config/env');
const logger = require('../utils/logger');

class DocumentService {
  /**
   * Save uploaded file record
   */
  static async uploadDocument(application, file, body) {
    if (!file) {
      const err = new Error('No file attached. Please attach a document file.');
      err.statusCode = 400;
      err.errorCode = 'FILE_REQUIRED';
      throw err;
    }

    // Security: Validate file extension against whitelist
    const ext = path.extname(file.originalname).toLowerCase();
    if (!env.upload.allowedExtensions.includes(ext)) {
      // Remove uploaded file if invalid
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      const err = new Error(`File extension '${ext}' is not permitted. Allowed: ${env.upload.allowedExtensions.join(', ')}`);
      err.statusCode = 400;
      err.errorCode = 'INVALID_FILE_TYPE';
      throw err;
    }

    const docData = {
      application_id: application.application_id,
      requirement_id: body.requirement_id || null,
      document_id: body.document_id || null,
      document_name: body.document_name || body.document_type || file.originalname,
      original_name: file.originalname,
      document_path: file.filename, // Store only the safe basename
      mime_type: file.mimetype,
      file_size: file.size,
    };

    const savedDoc = await DocumentRepository.saveDocument(docData);

    // Save MongoDB metadata if available
    await DocumentRepository.saveMongoMetadata(savedDoc.application_document_id, {
      originalName: file.originalname,
      storageKey: file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      checksum: file.filename.split('.')[0],
      uploadedAt: new Date(),
    });

    return savedDoc;
  }

  /**
   * Retrieve all documents for an application
   */
  static async getDocuments(applicationId) {
    return await DocumentRepository.findByApplicationId(applicationId);
  }

  /**
   * Retrieve document metadata by document ID
   */
  static async getDocumentById(documentId) {
    const doc = await DocumentRepository.findById(documentId);
    if (!doc) {
      const err = new Error(`Document #${documentId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'DOCUMENT_NOT_FOUND';
      throw err;
    }
    return doc;
  }

  /**
   * Retrieve file path for secure download
   */
  static async getDownloadStream(documentId) {
    const doc = await this.getDocumentById(documentId);

    // Prevent directory traversal attacks
    const safeBasename = path.basename(doc.document_path);
    const fullPath = path.resolve(env.upload.dir, safeBasename);

    if (!fullPath.startsWith(path.resolve(env.upload.dir))) {
      const err = new Error('Access denied: Invalid file path traversal.');
      err.statusCode = 403;
      err.errorCode = 'PATH_TRAVERSAL_DETECTED';
      throw err;
    }

    if (!fs.existsSync(fullPath)) {
      const err = new Error('The physical document file does not exist on disk.');
      err.statusCode = 404;
      err.errorCode = 'FILE_NOT_FOUND_ON_DISK';
      throw err;
    }

    return {
      doc,
      fullPath,
      safeBasename,
      mimeType: doc.mime_type || 'application/octet-stream',
      originalName: doc.original_name || safeBasename,
    };
  }

  /**
   * Verify document status (Admin / Reviewer)
   */
  static async verifyDocument(documentId, verificationStatus, reviewerComment, verifiedBy) {
    const doc = await this.getDocumentById(documentId);

    const updated = await DocumentRepository.updateVerification(
      documentId,
      verificationStatus,
      reviewerComment,
      verifiedBy
    );

    return updated;
  }

  /**
   * Delete document when permitted
   */
  static async deleteDocument(documentId, application) {
    // Only permit deletion in editable statuses
    const editableStatuses = ['DRAFT', 'SUBMITTED', 'DOCUMENTS_REQUIRED', 'CORRECTION_REQUIRED', 'RESUBMISSION_REQUIRED'];
    if (!editableStatuses.includes(application.status)) {
      const err = new Error(`Documents cannot be deleted while application is in '${application.status}' status.`);
      err.statusCode = 400;
      err.errorCode = 'DOCUMENT_DELETION_FORBIDDEN';
      throw err;
    }

    const doc = await this.getDocumentById(documentId);

    // Remove file from disk
    const safeBasename = path.basename(doc.document_path);
    const fullPath = path.resolve(env.upload.dir, safeBasename);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (e) {
        logger.warn(`Could not unlink file ${fullPath}: ${e.message}`);
      }
    }

    await DocumentRepository.deleteDocument(documentId);
    return true;
  }
}

module.exports = DocumentService;

