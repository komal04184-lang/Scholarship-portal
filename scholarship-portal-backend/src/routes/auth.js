const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../schemas');

// Student auth
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Admin/Reviewer auth
router.post('/admin/login', validate(loginSchema), authController.adminLogin);

// Get current user
router.get('/me', authenticate, authController.getMe);

module.exports = router;
