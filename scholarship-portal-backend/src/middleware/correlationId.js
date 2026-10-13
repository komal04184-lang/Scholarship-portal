const { v4: uuidv4 } = require('uuid');

/**
 * Attaches a unique correlation ID to each request.
 */
function correlationId(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('X-Correlation-Id', req.correlationId);
  next();
}

module.exports = { correlationId };
