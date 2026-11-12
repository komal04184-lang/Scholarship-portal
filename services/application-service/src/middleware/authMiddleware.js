const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Extract token from header or cookie
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.headers['x-access-token']) {
    return req.headers['x-access-token'].trim();
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

/**
 * Authenticate incoming request via JWT
 */
function authenticate(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. No bearer token or cookie provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    // Normalize user identity
    // Supports both monolith token { id: 1, email: "...", role: "STUDENT" }
    // and student-identity-service token { id: "64f...", role: "student" }
    const role = (decoded.role || 'STUDENT').toUpperCase();
    const id = decoded.id !== undefined ? decoded.id : decoded.student_id;

    if (!id) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload: missing user identifier.',
      });
    }

    req.user = {
      id: id,
      role: role,
      email: decoded.email || null,
      username: decoded.username || null,
      rawToken: token,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Authentication token has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token.',
    });
  }
}

/**
 * Role-based authorization guard
 */
function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const upperAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (upperAllowed.length > 0 && !upperAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: role '${userRole}' is not authorized. Allowed: [${upperAllowed.join(', ')}]`,
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
  extractToken,
};

