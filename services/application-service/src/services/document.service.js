const path = require('path');
const fs = require('fs');
const DocumentRepository = require('../repositories/document.repository');
const ApplicationRepository = require('../repositories/application.repository');
const AuditRepository = require('../repositories/audit.repository');
const StorageService = require('./storage.service');
const env = require('../config/env');
const logger = require('../utils/logger');

// GridFS integration (optional — graceful fallback to local filesystem)
let gridfsService = null;
try {
  gridfsService = require('./gridfs.service');
  logger.info('GridFS service loaded — MongoDB document storage enabled');
} catch (e) {
  logger.warn('GridFS service unavailable, using local filesystem storage only');
}

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

    // Security (SEC-02): Validate Server-side Magic Bytes against declared extension and MIME
    const fileHeaderBuffer = await fs.promises.readFile(file.path);
    if (!fileHeaderBuffer || fileHeaderBuffer.length < 4) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      const err = new Error('File corrupted or empty. Invalid binary format.');
      err.statusCode = 400;
      err.errorCode = 'INVALID_FILE_SIGNATURE';
      throw err;
    }

    let isMagicValid = false;
    // PDF: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    if (ext === '.pdf') {
      isMagicValid = fileHeaderBuffer.subarray(0, 5).toString('ascii') === '%PDF-';
    } else if (ext === '.png') {
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      isMagicValid = fileHeaderBuffer.length >= 8 && fileHeaderBuffer.subarray(0, 8).equals(pngHeader);
    } else if (ext === '.jpg' || ext === '.jpeg') {
      // JPEG: FF D8 FF
      isMagicValid = fileHeaderBuffer.length >= 3 && fileHeaderBuffer[0] === 0xFF && fileHeaderBuffer[1] === 0xD8 && fileHeaderBuffer[2] === 0xFF;
    }

    if (!isMagicValid) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      const err = new Error(`File binary signature does not match permitted ${ext.toUpperCase()} format.`);
      err.statusCode = 400;
      err.errorCode = 'INVALID_FILE_SIGNATURE';
      throw err;
    }

    // Process secure file storage (local filesystem)
    const storageResult = await StorageService.saveFile(
      file.path,
      file.originalname,
      file.mimetype
    );

    // Also upload to MongoDB GridFS for persistent cloud-like storage
    let gridfsId = null;
    if (gridfsService) {
      try {
        const gridfsAvailable = await gridfsService.isAvailable();
        if (gridfsAvailable) {
          const fileBuffer = await fs.promises.readFile(
            path.join(env.upload.dir, storageResult.storageKey)
          );
          const gfsResult = await gridfsService.uploadToGridFS(
            fileBuffer,
            file.originalname,
            file.mimetype,
            {
              applicationId: application.id || application.application_id,
              uploadedBy: user ? user.id : 'system',
              storageKey: storageResult.storageKey,
            }
          );
          gridfsId = gfsResult.gridfsId;
          logger.info(`Document also stored in GridFS: ${gridfsId}`);
        }
      } catch (gfsErr) {
        logger.warn(`GridFS upload failed (using local only): ${gfsErr.message}`);
      }
    }

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
      gridfs_id: gridfsId,
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
   * Uses GridFS if gridfsId is stored, falls back to local filesystem
   */
  static async getDownloadStream(documentId, user) {
    const doc = await this.getDocumentById(documentId, user);

    // Try GridFS first if available (by gridfs_id or via metadata lookup)
    if (gridfsService) {
      try {
        const gridfsAvailable = await gridfsService.isAvailable();
        if (gridfsAvailable) {
          const { getConnection } = gridfsService;
          const { bucket } = await getConnection();
          let gfsFiles = [];
          if (doc.gridfs_id) {
            const { ObjectId } = require('mongodb');
            gfsFiles = await bucket.find({ _id: new ObjectId(doc.gridfs_id) }).toArray();
          }
          if (gfsFiles.length === 0 && doc.storage_key) {
            gfsFiles = await bucket.find({ 'metadata.storageKey': doc.storage_key }).toArray();
          }

          if (gfsFiles.length > 0) {
            const targetFile = gfsFiles[0];
            const stream = bucket.openDownloadStream(targetFile._id);
            return {
              stream,
              filename: doc.original_filename || targetFile.filename,
              mimeType: doc.mime_type || (targetFile.metadata && targetFile.metadata.mimeType),
              sizeBytes: doc.file_size_bytes || targetFile.length,
              source: 'gridfs',
            };
          }
        }
      } catch (gfsErr) {
        logger.warn(`GridFS download fallback: ${gfsErr.message}`);
      }
    }

    // Fallback: local filesystem
    const stream = StorageService.getFileStream(doc.storage_key);
    return {
      stream,
      filename: doc.original_filename,
      mimeType: doc.mime_type,
      sizeBytes: doc.file_size_bytes,
      source: 'local',
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

    // If GridFS is available, clean up MongoDB GridFS chunked file
    if (gridfsService) {
      try {
        const gridfsAvailable = await gridfsService.isAvailable();
        if (gridfsAvailable) {
          const { getConnection } = gridfsService;
          const { bucket } = await getConnection();
          const gfsFiles = await bucket.find({ 'metadata.storageKey': doc.storage_key }).toArray();
          for (const gfsFile of gfsFiles) {
            await bucket.delete(gfsFile._id);
            logger.info(`Deleted GridFS document: ${gfsFile._id}`);
          }
        }
      } catch (gfsErr) {
        logger.warn(`GridFS delete error: ${gfsErr.message}`);
      }
    }

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
