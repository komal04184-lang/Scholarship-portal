const config = require('../config');

function errorHandler(err, req, res, next) {
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: `File size exceeds the limit of ${Math.round(config.upload.maxFileSize / (1024 * 1024))}MB.`,
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (config.nodeEnv === 'development' && statusCode === 500) {
    console.error('Unhandled server error:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(err.existing_application_id ? { existing_application_id: err.existing_application_id } : {}),
    ...(config.nodeEnv === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
  });
}

module.exports = errorHandler;

