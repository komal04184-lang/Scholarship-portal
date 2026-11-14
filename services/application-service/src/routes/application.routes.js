const express = require('express');
const router = express.Router();
const ApplicationController = require('../controllers/application.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validateRequest = require('../middleware/validate-request');
const {
  submitApplicationSchema,
  draftApplicationSchema,
  updateApplicationSchema,
  saveAnswersSchema,
  updateStatusSchema,
  withdrawApplicationSchema,
  queryApplicationsSchema,
} = require('../validators/application.validator');

// All application routes require authentication
router.use(authenticate);

// Student submits a new application (DRAFT or SUBMITTED)
router.post(
  '/',
  authorize('student'),
  validateRequest(submitApplicationSchema, 'body'),
  ApplicationController.submitApplication
);

// Student creates a draft application explicitly
router.post(
  '/draft',
  authorize('student'),
  validateRequest(draftApplicationSchema, 'body'),
  ApplicationController.createDraft
);

// Student submits an existing draft application
router.post(
  '/:id/submit',
  authorize('student'),
  ApplicationController.submitDraft
);

// Student saves dynamic form answers
router.post(
  '/:id/answers',
  authorize('student'),
  validateRequest(saveAnswersSchema, 'body'),
  ApplicationController.saveAnswers
);

// Retrieve saved form answers
router.get(
  '/:id/answers',
  ApplicationController.getAnswers
);

// Retrieve document requirements snapshot
router.get(
  '/:id/requirements',
  ApplicationController.getRequirements
);

// Retrieve application audit log trail
router.get(
  '/:id/audit-logs',
  ApplicationController.getAuditLogs
);

// Get logged-in student's applications
router.get(
  '/my',
  authorize('student'),
  validateRequest(queryApplicationsSchema, 'query'),
  ApplicationController.getMyApplications
);

// Admin / Reviewer listing with pagination and filters
router.get(
  '/admin/all',
  authorize('admin', 'reviewer'),
  validateRequest(queryApplicationsSchema, 'query'),
  ApplicationController.getAllApplications
);

// Dual-purpose base endpoint: returns student's applications for student, or list for admin
router.get(
  '/',
  validateRequest(queryApplicationsSchema, 'query'),
  ApplicationController.getMyApplications
);

// Health check under applications namespace (for gateway compatibility)
router.get('/health', (req, res) => res.json({ status: 'healthy', route: '/api/v1/applications/health' }));

// Application Details
router.get('/:id', ApplicationController.getApplicationById);

// Application Progress & Tracking (supports both /track and /tracking)
router.get('/:id/track', ApplicationController.trackApplication);
router.get('/:id/tracking', ApplicationController.trackApplication);

// Application Status History
router.get('/:id/status-history', ApplicationController.getStatusHistory);
router.get('/:id/history', ApplicationController.getStatusHistory);

// Student updates permitted application fields
router.patch(
  '/:id',
  authorize('student'),
  validateRequest(updateApplicationSchema, 'body'),
  ApplicationController.updateApplication
);

// Student withdraws application
router.post(
  '/:id/withdraw',
  authorize('student'),
  validateRequest(withdrawApplicationSchema, 'body'),
  ApplicationController.withdrawApplication
);

// Admin / Reviewer updates application status
router.patch(
  '/:id/status',
  authorize('admin', 'reviewer'),
  validateRequest(updateStatusSchema, 'body'),
  ApplicationController.updateStatus
);

module.exports = router;
