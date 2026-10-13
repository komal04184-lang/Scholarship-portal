const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Admin Auth
router.post('/login', AdminController.login);

// Protected Admin & Reviewer Endpoints
router.use(authenticate, authorize(['ADMIN', 'REVIEWER']));

// Dashboard metrics
router.get('/dashboard', AdminController.getDashboard);

// Scholarship management
router.get('/scholarships', AdminController.getAllScholarships);
router.post('/scholarships', AdminController.createScholarship);
router.put('/scholarships/:id', AdminController.updateScholarship);
router.post('/scholarships/:id/criteria', AdminController.upsertEligibilityCriteria);
router.post('/scholarships/:id/documents', AdminController.addRequiredDocument);
router.delete('/scholarships/documents/:docId', AdminController.deleteRequiredDocument);

// Application management
router.get('/applications', AdminController.getAllApplications);
router.patch('/applications/:id/status', AdminController.changeApplicationStatus);
router.patch('/applications/:id/assign', AdminController.assignReviewer);

// Student oversight
router.get('/students', AdminController.getAllStudents);
router.get('/students/:id', AdminController.getStudentDetails);

// Reviewer management
router.get('/reviewers', AdminController.getAllReviewers);
router.post('/reviewers', AdminController.createReviewer);

// Disbursement / Payment management
router.get('/payments', AdminController.getAllPayments);
router.post('/payments', AdminController.createPayment);
router.patch('/payments/:id/status', AdminController.updatePaymentStatus);

module.exports = router;
