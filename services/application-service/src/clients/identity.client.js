const http = require('http');
const https = require('https');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Identity Service Client
 * Communicates with the Auth & Student Identity Service (Port 3001)
 */
class IdentityClient {
  /**
   * Fetches the student profile from Identity Service
   * @param {string} token - JWT token
   * @returns {Promise<object>} Student profile or claims fallback
   */
  static async getStudentProfile(token, userClaims = null) {
    if (!token && !userClaims) {
      throw new Error('Identity verification requires a token or claims.');
    }

    const baseUrl = env.services.identityServiceUrl;

    return new Promise((resolve) => {
      try {
        const urlObj = new URL('/api/v1/profile/me', baseUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        const req = protocol.request(
          urlObj,
          {
            method: 'GET',
            headers: {
              'Cookie': `token=${token}`,
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
            timeout: 2500,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              try {
                if (res.statusCode === 200) {
                  const json = JSON.parse(data);
                  const user = json.user || json.data || json;
                  return resolve({
                    verified: true,
                    studentId: user._id || user.id || user.student_id,
                    user,
                  });
                }
                // If 401/403 or 404
                logger.warn(`Identity Service returned status ${res.statusCode}: ${data}`);
                return resolve({
                  verified: !!userClaims,
                  studentId: userClaims?.id,
                  user: userClaims,
                });
              } catch (e) {
                resolve({ verified: !!userClaims, studentId: userClaims?.id, user: userClaims });
              }
            });
          }
        );

        req.on('timeout', () => {
          req.destroy();
          logger.warn('Identity Service timed out; using verified JWT claims.');
          resolve({ verified: !!userClaims, studentId: userClaims?.id, user: userClaims });
        });

        req.on('error', (err) => {
          logger.warn(`Identity Service connection error (${err.message}); using verified JWT claims.`);
          resolve({ verified: !!userClaims, studentId: userClaims?.id, user: userClaims });
        });

        req.end();
      } catch (err) {
        logger.warn(`Identity Service request preparation failed: ${err.message}`);
        resolve({ verified: !!userClaims, studentId: userClaims?.id, user: userClaims });
      }
    });
  }
}

module.exports = IdentityClient;

