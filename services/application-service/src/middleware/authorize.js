const ApiResponse = require('../utils/api-response');

/**
 * Role-Based Access Control Middleware
 * @param  {...string} allowedRoles - e.g. 'student', 'admin', 'reviewer'
 */
function authorize(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map((r) => String(r).toLowerCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return ApiResponse.unauthorized(res, 'Authentication required before authorization.', 'UNAUTHORIZED');
    }

    const userRole = String(req.user.role).toLowerCase();

    if (!normalizedAllowed.includes(userRole)) {
      return ApiResponse.forbidden(
        res,
        `Forbidden: role '${req.user.rawRole || userRole}' is not authorized. Allowed: [${allowedRoles.join(', ')}]`,
        'FORBIDDEN'
      );
    }

    return next();
  };
}

module.exports = authorize;

