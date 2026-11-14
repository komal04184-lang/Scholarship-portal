const DocumentService = require('../services/document.service');
const ApplicationRepository = require('../repositories/application.repository');
const ApiResponse = require('../utils/api-response');

class DocumentController {
  /**
   * Helper: check application ownership for document actions
   */
  static async _checkAccess(applicationId, user) {
    const application = await ApplicationRepository.findById(applicationId);
    if (!application) {
      const err = new Error(`Application #${applicationId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'APPLICATION_NOT_FOUND';
      throw err;
    }
    if (user.role === 'student' && String(application.student_id) !== String(user.id)) {
      const err = new Error('Access denied: You do not have permission to access or modify this application.');
      err.statusCode = 403;
      err.errorCode = 'ACCESS_DENIED';
      throw err;
    }
    return application;
  }

  /**
   * POST /api/v1/applications/:id/documents
   */
  static async uploadDocument(req, res, next) {
    try {
      const application = await DocumentController._checkAccess(req.params.id, req.user);
      const document = await DocumentService.uploadDocument(application, req.file, req.body, req.user);
      return ApiResponse.created(res, 'Document uploaded successfully', { document });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/applications/:id/documents/:documentId (Replace Document)
   */
  static async replaceDocument(req, res, next) {
    try {
      await DocumentController._checkAccess(req.params.id, req.user);
      const document = await DocumentService.replaceDocument(req.params.documentId, req.file, req.body, req.user);
      return ApiResponse.success(res, 'Document replaced successfully', { document });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/:id/documents
   */
  static async getDocuments(req, res, next) {
    try {
      await DocumentController._checkAccess(req.params.id, req.user);
      const documents = await DocumentService.getDocuments(req.params.id, req.user);
      return ApiResponse.success(res, 'Documents retrieved successfully', { documents });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/:id/documents/:documentId
   */
  static async getDocumentById(req, res, next) {
    try {
      await DocumentController._checkAccess(req.params.id, req.user);
      const document = await DocumentService.getDocumentById(req.params.documentId, req.user);
      return ApiResponse.success(res, 'Document metadata retrieved successfully', { document });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/:id/documents/:documentId/download
   */
  static async downloadDocument(req, res, next) {
    try {
      await DocumentController._checkAccess(req.params.id, req.user);
      const fileInfo = await DocumentService.getDownloadStream(req.params.documentId, req.user);

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileInfo.filename)}"`);
      if (fileInfo.sizeBytes) {
        res.setHeader('Content-Length', fileInfo.sizeBytes);
      }

      fileInfo.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/applications/:id/documents/:documentId/verify (Reviewer / Admin)
   */
  static async verifyDocument(req, res, next) {
    try {
      const { verification_status, comment, reviewer_comment } = req.body;
      const updated = await DocumentService.verifyDocument(
        req.params.documentId,
        verification_status,
        reviewer_comment || comment,
        req.user
      );

      return ApiResponse.success(res, `Document verification updated to ${verification_status}`, {
        document: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/applications/:id/documents/:documentId
   */
  static async deleteDocument(req, res, next) {
    try {
      await DocumentController._checkAccess(req.params.id, req.user);
      const result = await DocumentService.deleteDocument(req.params.documentId, req.user);
      return ApiResponse.success(res, result.message || 'Document deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DocumentController;
