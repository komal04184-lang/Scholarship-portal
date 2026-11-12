/**
 * Standardized API Response Utilities
 */

class ApiResponse {
  static success(res, message, data = null, statusCode = 200) {
    const response = {
      success: true,
      message,
    };
    if (data !== null && data !== undefined) {
      response.data = data;
      // Also spread top-level keys if data is an object so existing consumers/tests don't break
      if (typeof data === 'object' && !Array.isArray(data)) {
        Object.assign(response, data);
      }
    }
    return res.status(statusCode).json(response);
  }

  static created(res, message, data = null) {
    return ApiResponse.success(res, message, data, 201);
  }

  static error(res, message, code = 'INTERNAL_ERROR', statusCode = 500, details = null) {
    const response = {
      success: false,
      error: {
        code,
        message: typeof message === 'string' ? message : (message?.message || 'An error occurred'),
      },
    };
    // Support top-level error string for backward compatibility
    if (typeof message === 'string') {
      response.errorMessage = message;
    }
    if (details) {
      response.error.details = details;
    }
    return res.status(statusCode).json(response);
  }

  static badRequest(res, message, code = 'BAD_REQUEST', details = null) {
    return ApiResponse.error(res, message, code, 400, details);
  }

  static unauthorized(res, message = 'Authentication required', code = 'UNAUTHORIZED') {
    return ApiResponse.error(res, message, code, 401);
  }

  static forbidden(res, message = 'Access denied', code = 'FORBIDDEN') {
    return ApiResponse.error(res, message, code, 403);
  }

  static notFound(res, message = 'Resource not found', code = 'NOT_FOUND') {
    return ApiResponse.error(res, message, code, 404);
  }

  static conflict(res, message = 'Conflict with existing resource', code = 'CONFLICT', details = null) {
    return ApiResponse.error(res, message, code, 409, details);
  }
}

module.exports = ApiResponse;

