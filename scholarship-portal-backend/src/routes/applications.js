const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { applicationSchema } = require('../schemas');
const upload = require('../middleware/upload');

router.use(authenticate);

// Student routes
router.post('/', authorize('STUDENT'), validate(applicationSchema), applicationController.createApplication);
router.get('/', authorize('STUDENT'), applicationController.getMyApplications);
router.get('/:id', applicationController.getApplication);

// Document upload (student)
router.post('/:id/documents', authorize('STUDENT'), upload.single('document'), applicationController.uploadDocument);

// Document download (student + admin/reviewer)
router.get('/:id/documents/:docId/download', applicationController.downloadDocument);

module.exports = router;
