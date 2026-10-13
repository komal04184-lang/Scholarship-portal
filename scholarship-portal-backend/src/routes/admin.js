const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  scholarshipSchema, eligibilityCriteriaSchema, requiredDocumentSchema,
  reviewerSchema, reviewerUpdateSchema, paymentSchema, paymentUpdateSchema,
  applicationStatusChangeSchema,
} = require('../schemas');

// All admin routes require admin or reviewer auth
router.use(authenticate);
router.use(authorize('ADMIN', 'REVIEWER'));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Scholarships
router.get('/scholarships', adminController.getAllScholarshipsAdmin);
router.post('/scholarships', authorize('ADMIN'), validate(scholarshipSchema), adminController.createScholarship);
router.put('/scholarships/:id', authorize('ADMIN'), adminController.updateScholarship);

// Eligibility Criteria
router.get('/scholarships/:id/eligibility', adminController.getEligibilityCriteria);
router.put('/scholarships/:id/eligibility', authorize('ADMIN'), validate(eligibilityCriteriaSchema), adminController.upsertEligibilityCriteria);

// Required Documents
router.get('/scholarships/:id/documents', adminController.getRequiredDocuments);
router.post('/scholarships/:id/documents', authorize('ADMIN'), validate(requiredDocumentSchema), adminController.addRequiredDocument);
router.delete('/scholarships/documents/:docId', authorize('ADMIN'), adminController.deleteRequiredDocument);

// Students
router.get('/students', adminController.getAllStudents);
router.get('/students/:id', adminController.getStudentDetail);

// Applications
router.get('/applications', adminController.getAllApplications);
router.patch('/applications/:id/status', validate(applicationStatusChangeSchema), adminController.changeApplicationStatus);
router.patch('/applications/:id/assign-reviewer', adminController.assignReviewer);

// Document Verification
router.get('/documents/pending', adminController.getPendingDocuments);
router.patch('/documents/:docId/verify', adminController.verifyDocument);

// Reviewers
router.get('/reviewers', adminController.getAllReviewers);
router.post('/reviewers', authorize('ADMIN'), validate(reviewerSchema), adminController.createReviewer);
router.put('/reviewers/:id', authorize('ADMIN'), validate(reviewerUpdateSchema), adminController.updateReviewer);

// Payments
router.get('/payments', adminController.getAllPayments);
router.post('/payments', authorize('ADMIN'), validate(paymentSchema), adminController.createPayment);
router.patch('/payments/:id/status', authorize('ADMIN'), validate(paymentUpdateSchema), adminController.updatePaymentStatus);

// Audit
router.get('/audit', adminController.getAuditEvents);

module.exports = router;
