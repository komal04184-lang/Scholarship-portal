const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/studentController');
const { authenticate } = require('../middleware/authMiddleware');

// Auth endpoints
router.post('/register', StudentController.register);
router.post('/login', StudentController.login);

// Profile & Academic Details
router.get('/profile', authenticate, StudentController.getProfile);
router.put('/profile', authenticate, StudentController.updateProfile);
router.get('/academics', authenticate, StudentController.getAcademics);
router.post('/academics', authenticate, StudentController.addAcademics);

// Student Applications & Notifications
router.get('/applications', authenticate, StudentController.getMyApplications);
router.get('/notifications', authenticate, StudentController.getNotifications);

module.exports = router;
