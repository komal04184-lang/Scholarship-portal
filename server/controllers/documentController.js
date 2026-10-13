const DocumentModel = require('../models/documentModel');
const DocumentService = require('../services/documentService');

class DocumentController {
  static async uploadDocument(req, res, next) {
    try {
      const { applicationId, requirementId } = req.body;
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const doc = await DocumentService.uploadDocument({
        applicationId,
        requirementId,
        file: req.file,
      });

      res.status(201).json({ message: 'Document uploaded', document: doc });
    } catch (err) {
      next(err);
    }
  }

  static async verifyDocument(req, res, next) {
    try {
      const { id } = req.params; // document_id or application_document_id
      const { verification_status, reviewer_comment } = req.body;
      const verifiedBy = req.user.id;

      const doc = await DocumentService.verifyDocument({
        documentId: id,
        verificationStatus: verification_status,
        reviewerComment: reviewer_comment,
        verifiedBy,
      });

      res.json({ message: `Document marked as ${verification_status}`, document: doc });
    } catch (err) {
      next(err);
    }
  }

  static async getPendingDocuments(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const result = await DocumentModel.findPending({
        limit: parseInt(limit, 10),
        offset,
      });

      res.json({
        documents: result.documents,
        pagination: {
          total: result.total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async downloadDocument(req, res, next) {
    try {
      const { id } = req.params;
      const fileInfo = await DocumentService.getFilePath(id);

      res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
      res.sendFile(fileInfo.filePath);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DocumentController;
