const express = require('express');
const router = express.Router();
const ApplicationController = require('../controllers/applicationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireApplicationOwnership } = require('../middleware/accessControlMiddleware');
const upload = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  submitApplicationSchema,
  updateApplicationSchema,
  updateStatusSchema,
  queryApplicationsSchema,
  verifyDocumentSchema,
} = require('../schemas/applicationSchema');

// Health Check
router.get('/health', ApplicationController.getHealth);

// Admin / Reviewer list all applications
router.get(
  '/admin/all',
  authenticate,
  authorize(['ADMIN', 'REVIEWER']),
  validate(queryApplicationsSchema, 'query'),
  ApplicationController.getAllApplications
);

// Submit new application (Student only)
router.post(
  '/',
  authenticate,
  authorize(['STUDENT']),
  validate(submitApplicationSchema),
  ApplicationController.submitApplication
);

// Get logged-in student's applications
router.get('/', authenticate, ApplicationController.getMyApplications);
router.get('/my', authenticate, ApplicationController.getMyApplications);

// Application details (Student owner or Admin/Reviewer)
router.get('/:id', authenticate, requireApplicationOwnership(), ApplicationController.getApplicationById);

// Application tracking (Progress, milestones, next steps)
router.get('/:id/track', authenticate, requireApplicationOwnership(), ApplicationController.trackApplication);

// Application status history
router.get('/:id/history', authenticate, requireApplicationOwnership(), ApplicationController.getStatusHistory);

// Update application statement / SOP (Permitted in DRAFT / CORRECTION_REQUIRED / SUBMITTED)
router.patch(
  '/:id',
  authenticate,
  requireApplicationOwnership(),
  validate(updateApplicationSchema),
  ApplicationController.updateApplication
);

// Update status (Admin / Reviewer only)
router.patch(
  '/:id/status',
  authenticate,
  authorize(['ADMIN', 'REVIEWER']),
  validate(updateStatusSchema),
  ApplicationController.updateStatus
);

// Upload document attachment for an application
router.post(
  '/:id/documents',
  authenticate,
  requireApplicationOwnership(),
  upload.single('document'),
  ApplicationController.uploadDocument
);

// List documents for an application
router.get(
  '/:id/documents',
  authenticate,
  requireApplicationOwnership(),
  ApplicationController.getDocuments
);

// Download document
router.get(
  '/:id/documents/:docId/download',
  authenticate,
  requireApplicationOwnership(),
  ApplicationController.downloadDocument
);

// Verify document (Admin / Reviewer only)
router.patch(
  '/:id/documents/:docId/verify',
  authenticate,
  authorize(['ADMIN', 'REVIEWER']),
  validate(verifyDocumentSchema),
  ApplicationController.verifyDocument
);

module.exports = router;

