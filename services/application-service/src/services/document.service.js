const path = require('path');
const fs = require('fs');
const DocumentRepository = require('../repositories/document.repository');
const ApplicationRepository = require('../repositories/application.repository');
const AuditRepository = require('../repositories/audit.repository');
const StorageService = require('./storage.service');
const env = require('../config/env');
const logger = require('../utils/logger');

class DocumentService {
  /**
   * Upload and attach a document to an application
   */
  static async uploadDocument(application, file, body, user) {
    if (!file) {
      const err = new Error('No file attached. Please attach a document file.');
      err.statusCode = 400;
      err.errorCode = 'FILE_REQUIRED';
      throw err;
    }

    // Security: Validate file extension against whitelist
    const ext = path.extname(file.originalname).toLowerCase();
    if (!env.upload.allowedExtensions.includes(ext)) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      const err = new Error(`File extension '${ext}' is not permitted. Allowed: ${env.upload.allowedExtensions.join(', ')}`);
      err.statusCode = 400;
      err.errorCode = 'INVALID_FILE_TYPE';
      throw err;
    }

    // Process secure file storage
    const storageResult = await StorageService.saveFile(
      file.path,
      file.originalname,
      file.mimetype
    );

    // Clean up temporary multer upload file if different
    if (file.path && fs.existsSync(file.path) && path.basename(file.path) !== storageResult.storageKey) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }

    const docData = {
      application_id: application.id || application.application_id,
      requirement_id: body.requirement_id || null,
      uploaded_by_user_id: user ? user.id : application.student_id,
      document_type: body.document_type || body.document_name || file.originalname.split('.')[0] || 'Document',
      original_filename: file.originalname,
      storage_key: storageResult.storageKey,
      mime_type: file.mimetype,
      file_size_bytes: storageResult.fileSize,
      checksum_sha256: storageResult.checksum,
      verification_status: 'PENDING',
    };

    const savedDoc = await DocumentRepository.saveDocument(docData);

    // Record audit log
    await AuditRepository.recordLog(
      application.id || application.application_id,
      user ? user.id : 'STUDENT',
      user ? user.role : 'student',
      'DOCUMENT_UPLOADED',
      `Uploaded document ${file.originalname} (${docData.document_type})`,
      { documentId: savedDoc.id, size: storageResult.fileSize, mime: file.mimetype }
    );

    return savedDoc;
  }

  /**
   * Replace an existing uploaded document with a newer file
   */
  static async replaceDocument(documentId, file, body, user) {
    if (!file) {
      const err = new Error('No replacement file provided.');
      err.statusCode = 400;
      err.errorCode = 'FILE_REQUIRED';
      throw err;
    }

    const existingDoc = await DocumentRepository.findById(documentId);
    if (!existingDoc) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      const err = new Error(`Document #${documentId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'DOCUMENT_NOT_FOUND';
      throw err;
    }

    // Ownership check: Student can only replace documents on their own application
    const application = await ApplicationRepository.findById(existingDoc.application_id);
    if (user.role === 'student' && String(application.student_id) !== String(user.id)) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      const err = new Error('Access denied: You do not have permission to replace this document.');
      err.statusCode = 403;
      err.errorCode = 'ACCESS_DENIED';
      throw err;
    }

    const storageResult = await StorageService.saveFile(
      file.path,
      file.originalname,
      file.mimetype
    );

    if (file.path && fs.existsSync(file.path) && path.basename(file.path) !== storageResult.storageKey) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }

    const newDocData = {
      application_id: existingDoc.application_id,
      requirement_id: body.requirement_id || existingDoc.requirement_id,
      uploaded_by_user_id: user.id,
      document_type: body.document_type || existingDoc.document_type || 'Document',
      original_filename: file.originalname,
      storage_key: storageResult.storageKey,
      mime_type: file.mimetype,
      file_size_bytes: storageResult.fileSize,
      checksum_sha256: storageResult.checksum,
    };

    const replaced = await DocumentRepository.replaceDocument(documentId, newDocData);

    await AuditRepository.recordLog(
      existingDoc.application_id,
      user.id,
      user.role,
      'DOCUMENT_REPLACED',
      `Replaced document ${existingDoc.original_filename} with ${file.originalname}`,
      { oldDocumentId: documentId, newDocumentId: replaced.id }
    );

    return replaced;
  }

  /**
   * Retrieve all active documents for an application
   */
  static async getDocuments(applicationId, user) {
    const application = await ApplicationRepository.findById(applicationId);
    if (!application) {
      const err = new Error(`Application #${applicationId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'APPLICATION_NOT_FOUND';
      throw err;
    }

    if (user.role === 'student' && String(application.student_id) !== String(user.id)) {
      const err = new Error('Access denied.');
      err.statusCode = 403;
      err.errorCode = 'ACCESS_DENIED';
      throw err;
    }

    return await DocumentRepository.findByApplicationId(application.id || application.application_id);
  }

  /**
   * Retrieve single document metadata
   */
  static async getDocumentById(documentId, user) {
    const doc = await DocumentRepository.findById(documentId);
    if (!doc) {
      const err = new Error(`Document #${documentId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'DOCUMENT_NOT_FOUND';
      throw err;
    }

    const application = await ApplicationRepository.findById(doc.application_id);
    if (user.role === 'student' && String(application.student_id) !== String(user.id)) {
      const err = new Error('Access denied.');
      err.statusCode = 403;
      err.errorCode = 'ACCESS_DENIED';
      throw err;
    }

    return doc;
  }

  /**
   * Retrieve file stream and metadata for secure authorized download
   */
  static async getDownloadStream(documentId, user) {
    const doc = await this.getDocumentById(documentId, user);
    const stream = StorageService.getFileStream(doc.storage_key);

    return {
      stream,
      filename: doc.original_filename,
      mimeType: doc.mime_type,
      sizeBytes: doc.file_size_bytes,
    };
  }

  /**
   * Delete or soft-delete a document
   */
  static async deleteDocument(documentId, user) {
    const doc = await this.getDocumentById(documentId, user);
    const application = await ApplicationRepository.findById(doc.application_id);

    if (user.role === 'student' && String(application.student_id) !== String(user.id)) {
      const err = new Error('Access denied.');
      err.statusCode = 403;
      err.errorCode = 'ACCESS_DENIED';
      throw err;
    }

    await DocumentRepository.deleteDocument(documentId);
    await StorageService.deleteFile(doc.storage_key);

    await AuditRepository.recordLog(
      doc.application_id,
      user.id,
      user.role,
      'DOCUMENT_DELETED',
      `Deleted document ${doc.original_filename}`,
      { documentId }
    );

    return { success: true, message: 'Document deleted successfully' };
  }

  /**
   * Verify document status (Admin / Reviewer)
   */
  static async verifyDocument(documentId, status, reviewerComment, user) {
    const doc = await DocumentRepository.findById(documentId);
    if (!doc) {
      const err = new Error(`Document #${documentId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'DOCUMENT_NOT_FOUND';
      throw err;
    }

    const updated = await DocumentRepository.updateVerification(
      documentId,
      status,
      reviewerComment,
      user.id
    );

    await AuditRepository.recordLog(
      doc.application_id,
      user.id,
      user.role,
      'DOCUMENT_VERIFICATION_UPDATED',
      `Document ${doc.original_filename} marked as ${status}`,
      { documentId, status, remarks: reviewerComment }
    );

    return updated;
  }
}

module.exports = DocumentService;
