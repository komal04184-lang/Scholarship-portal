const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiResponse = require('../utils/api-response');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 * Supports both HTTP-only cookie 'token' (Student Identity Service)
 * and 'Authorization: Bearer <token>' header.
 */
function authenticate(req, res, next) {
  let token = null;

  // 1. Check cookies (Student Identity Service convention)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 2. Check Authorization header
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      token = parts[1];
    } else {
      token = req.headers.authorization;
    }
  }

  if (!token) {
    return ApiResponse.unauthorized(res, 'Authentication required. No bearer token or cookie provided.', 'UNAUTHORIZED');
  }

  try {
    const decoded = jwt.verify(token, env.jwt.secret, {
      algorithms: [env.jwt.algorithm, 'HS256', 'RS256'],
    });

    // Normalize user object across Student Identity Service & Monolith formats
    const roleRaw = decoded.role || (decoded.roles && decoded.roles[0]) || 'student';
    const role = String(roleRaw).toLowerCase();

    req.user = {
      id: String(decoded.id || decoded.userId || decoded.student_id || decoded._id || ''),
      email: decoded.email || null,
      role: role, // 'student', 'admin', 'reviewer'
      rawRole: roleRaw,
      decoded,
    };

    if (!req.user.id) {
      return ApiResponse.unauthorized(res, 'Invalid token payload: missing student/user identifier.', 'INVALID_TOKEN');
    }

    return next();
  } catch (err) {
    logger.warn('JWT Verification failed', { error: err.message });
    if (err.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Authentication token has expired. Please log in again.', 'TOKEN_EXPIRED');
    }
    return ApiResponse.unauthorized(res, 'Invalid authentication token.', 'INVALID_TOKEN');
  }
}

module.exports = authenticate;

