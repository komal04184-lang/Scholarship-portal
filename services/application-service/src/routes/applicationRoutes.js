const express = require('express');
const router = express.Router();
const ApplicationController = require('../controllers/applicationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireApplicationOwnership } = require('../middleware/accessControlMiddleware');
const { triggerScholarshipDisbursement } = require('../services/paymentClient');
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

// Update application status and trigger payout on APPROVED
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, approvedAmount } = req.body;

  try {
    // 1. Find and update the application in your database
    // (Use Mongoose findByIdAndUpdate if application-service uses MongoDB, or your SQL query)
    const application = await Application.findByIdAndUpdate(
      id,
      { status, ...(approvedAmount && { approvedAmount }) },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // 2. Trigger disbursement in payment-service if approved
    let disbursement = null;
    if (status === 'APPROVED') {
      try {
        disbursement = await triggerScholarshipDisbursement({
          applicationId: String(application._id || application.id),
          studentId: String(application.studentId),
          scholarshipId: String(application.scholarshipId),
          amount: approvedAmount || application.approvedAmount || application.amount || 10000,
          installmentNo: 1
        });
      } catch (err) {
        console.error('[Application Service] Disbursement trigger failed:', err.response?.data || err.message);
      }
    }

    return res.status(200).json({
      message: `Application status updated to ${status}`,
      application,
      disbursement
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update status', details: err.message });
  }
});

module.exports = router;

