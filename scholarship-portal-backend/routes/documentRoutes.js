const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/documentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Document upload
router.post('/upload', authenticate, upload.single('document'), DocumentController.uploadDocument);

// Document verification (Reviewer & Admin)
router.patch('/:id/verify', authenticate, authorize(['ADMIN', 'REVIEWER']), DocumentController.verifyDocument);

// Pending documents queue (Reviewer & Admin)
router.get('/pending', authenticate, authorize(['ADMIN', 'REVIEWER']), DocumentController.getPendingDocuments);

// Download document
router.get('/:id/download', authenticate, DocumentController.downloadDocument);

module.exports = router;
