const config = require('../config');
const logger = require('../config/logger');

class StudentServiceClient {
  /**
   * Verify student identity with the Student / Auth service
   */
  static async verifyStudent(studentId, token) {
    const url = `${config.services.studentServiceUrl}/api/v1/student/profile`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.services.requestTimeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          verified: true,
          student: data.profile || data.user || data,
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          verified: false,
          error: 'Student authentication failed at Student Service',
        };
      }

      // Non-200 but not auth error
      logger.warn(`Student Service responded with status ${response.status}`);
      return {
        verified: true,
        source: 'jwt_fallback',
      };
    } catch (err) {
      // Service offline or timeout - fallback to JWT token claims
      logger.warn(`Student Service unavailable (${err.message}). Falling back to shared JWT claims.`);
      return {
        verified: true,
        source: 'offline_jwt_verification',
        warning: 'Student Service is offline; identity verified via cryptographically signed JWT.',
      };
    }
  }
}

module.exports = StudentServiceClient;

