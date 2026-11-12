const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const DocumentController = require('../controllers/document.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validateRequest = require('../middleware/validate-request');
const env = require('../config/env');
const {
  uploadDocumentSchema,
  verifyDocumentSchema,
} = require('../validators/document.validator');

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.upload.dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  if (env.upload.allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(`Unsupported MIME type: '${file.mimetype}'. Allowed: ${env.upload.allowedMimes.join(', ')}`);
    err.name = 'MulterError';
    err.code = 'LIMIT_UNEXPECTED_FILE';
    cb(err, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: env.upload.maxFileSize,
  },
  fileFilter,
});

// All document routes require authentication
router.use(authenticate);

// Upload document attachment for an application
router.post(
  '/:id/documents',
  authorize('student', 'admin'),
  upload.single('document'),
  validateRequest(uploadDocumentSchema, 'body'),
  DocumentController.uploadDocument
);

// List all documents for an application
router.get(
  '/:id/documents',
  DocumentController.getDocuments
);

// Get specific document metadata
router.get(
  '/:id/documents/:documentId',
  DocumentController.getDocumentById
);

// Secure document download
router.get(
  '/:id/documents/:documentId/download',
  DocumentController.downloadDocument
);

// Verify document (Admin / Reviewer)
router.patch(
  '/:id/documents/:documentId/verify',
  authorize('admin', 'reviewer'),
  validateRequest(verifyDocumentSchema, 'body'),
  DocumentController.verifyDocument
);

// Delete document when permitted (Student owner or Admin)
router.delete(
  '/:id/documents/:documentId',
  authorize('student', 'admin'),
  DocumentController.deleteDocument
);

module.exports = router;

