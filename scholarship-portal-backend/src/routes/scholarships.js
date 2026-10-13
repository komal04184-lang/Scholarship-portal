const express = require('express');
const router = express.Router();
const scholarshipController = require('../controllers/scholarshipController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.get('/', scholarshipController.listScholarships);
router.get('/featured', scholarshipController.getFeaturedScholarships);
router.get('/:id', scholarshipController.getScholarship);

// Authenticated routes
router.post('/:id/check-eligibility', authenticate, scholarshipController.checkEligibility);

module.exports = router;
