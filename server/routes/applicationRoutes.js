const express = require('express');
const router = express.Router();
const ApplicationController = require('../controllers/applicationController');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Student endpoints
router.post('/', authenticate, ApplicationController.submitApplication);
router.get('/', authenticate, ApplicationController.getMyApplications);
router.get('/:id', authenticate, ApplicationController.getApplicationById);

// Document upload & download for application
router.post('/:id/documents', authenticate, upload.single('document'), ApplicationController.uploadDocument);
router.get('/:id/documents/:docId/download', authenticate, ApplicationController.downloadDocument);

module.exports = router;
