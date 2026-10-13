const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_k9x2m4p7';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const upperAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (upperAllowed.length > 0 && !upperAllowed.includes(userRole)) {
      return res.status(403).json({
        error: `Forbidden: role '${userRole}' is not authorized to access this resource. Required: [${upperAllowed.join(', ')}]`,
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
