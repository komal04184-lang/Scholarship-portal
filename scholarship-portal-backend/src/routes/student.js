const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { profileSchema, academicSchema } = require('../schemas');

// All student routes require authentication
router.use(authenticate);
router.use(authorize('STUDENT'));

// Dashboard
router.get('/dashboard', studentController.getDashboard);

// Profile
router.get('/profile', studentController.getProfile);
router.put('/profile', validate(profileSchema), studentController.updateProfile);

// Academics
router.get('/academics', studentController.getAcademics);
router.post('/academics', validate(academicSchema), studentController.addAcademic);
router.put('/academics/:id', validate(academicSchema), studentController.updateAcademic);
router.delete('/academics/:id', studentController.deleteAcademic);

// Notifications
router.get('/notifications', studentController.getNotifications);
router.patch('/notifications/:id/read', studentController.markNotificationRead);

module.exports = router;
