const ApiResponse = require('../utils/api-response');
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Centralized Application Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  logger.error(err.message, {
    stack: env.isProduction ? undefined : err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Multer File Upload Errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ApiResponse.badRequest(res, 'File size exceeds permitted 10MB limit.', 'FILE_TOO_LARGE');
    }
    return ApiResponse.badRequest(res, err.message, 'UPLOAD_ERROR');
  }

  // Joi Validation Errors
  if (err.isJoi) {
    const details = err.details?.map((d) => d.message.replace(/['"]/g, '')) || [err.message];
    return ApiResponse.badRequest(res, details.join(', '), 'VALIDATION_ERROR', details);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid authentication token.', 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Authentication token has expired.', 'TOKEN_EXPIRED');
  }

  // SyntaxError in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ApiResponse.badRequest(res, 'Malformed JSON payload.', 'INVALID_JSON');
  }

  // PostgreSQL duplicate key constraint violation
  if (err.code === '23505') {
    return ApiResponse.conflict(res, 'Duplicate resource entry exists.', 'DUPLICATE_ENTRY');
  }

  // Custom Business Error
  if (err.statusCode) {
    return ApiResponse.error(res, err.message, err.errorCode || 'ERROR', err.statusCode);
  }

  // Generic Internal Server Error
  const message = env.isProduction ? 'Internal Server Error' : err.message;
  return ApiResponse.error(res, message, 'INTERNAL_SERVER_ERROR', 500);
}

module.exports = errorHandler;

