const logger = require('../config/logger');

/**
 * Centralized error handling middleware.
 */
function errorHandler(err, req, res, _next) {
  const correlationId = req.correlationId || 'unknown';

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    correlationId,
    method: req.method,
    url: req.originalUrl,
  });

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }

  // Multer unexpected field
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field' });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
