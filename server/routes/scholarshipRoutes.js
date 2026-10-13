const express = require('express');
const router = express.Router();
const ScholarshipController = require('../controllers/scholarshipController');
const { authenticate } = require('../middleware/authMiddleware');

// Public listing
router.get('/', ScholarshipController.getScholarships);
router.get('/featured', ScholarshipController.getFeatured);
router.get('/:id', ScholarshipController.getScholarshipById);

// Eligibility check (requires student authentication)
router.post('/:id/check-eligibility', authenticate, ScholarshipController.checkEligibility);

module.exports = router;
