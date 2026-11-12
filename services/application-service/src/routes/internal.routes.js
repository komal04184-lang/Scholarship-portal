const express = require('express');
const router = express.Router();
const InternalController = require('../controllers/internal.controller');
const env = require('../config/env');
const ApiResponse = require('../utils/api-response');

// Service-to-Service Internal Authentication Middleware
function internalServiceAuth(req, res, next) {
  const serviceToken = req.headers['x-service-token'] || 
                       (req.headers.authorization && req.headers.authorization.replace(/^Bearer /i, ''));

  if (!serviceToken || serviceToken !== env.services.serviceToServiceSecret) {
    return ApiResponse.unauthorized(
      res,
      'Access denied: Invalid or missing internal service-to-service authentication token.',
      'INVALID_SERVICE_TOKEN'
    );
  }

  next();
}

router.use(internalServiceAuth);

// Retrieve application details for authorized services (Review Service, Payment Service)
router.get('/applications/:id', InternalController.getApplication);

// Search applications using permitted filters
router.get('/applications', InternalController.searchApplications);

// Apply an authorized lifecycle transition from Review or Payment service
router.patch('/applications/:id/status', InternalController.updateStatus);

module.exports = router;

