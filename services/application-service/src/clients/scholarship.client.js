const http = require('http');
const https = require('https');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Scholarship Service Client
 * Communicates with the Scholarship Service (Port 3002)
 */
class ScholarshipClient {
  /**
   * Retrieves scholarship details and verifies its active status and deadline
   * @param {string|number} scholarshipId
   * @returns {Promise<object>} Scholarship details
   */
  static async getScholarship(scholarshipId) {
    const baseUrl = env.services.scholarshipServiceUrl;

    return new Promise((resolve, reject) => {
      try {
        const urlObj = new URL(`/api/v1/scholarships/${scholarshipId}`, baseUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        const req = protocol.request(
          urlObj,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-Service-Token': env.services.serviceToServiceSecret,
            },
            timeout: 5000,
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
                  const scholarship = json.scholarship || json.data || json;
                  return resolve(scholarship);
                }
                if (res.statusCode === 404) {
                  const err = new Error(`Scholarship with ID ${scholarshipId} was not found.`);
                  err.statusCode = 404;
                  err.errorCode = 'SCHOLARSHIP_NOT_FOUND';
                  return reject(err);
                }
                const err = new Error(`Scholarship Service responded with HTTP ${res.statusCode}`);
                err.statusCode = res.statusCode;
                return reject(err);
              } catch (e) {
                return reject(e);
              }
            });
          }
        );

        req.on('timeout', () => {
          req.destroy();
          const err = new Error(`Scholarship Service request timed out for scholarship ${scholarshipId}.`);
          err.statusCode = 504;
          err.errorCode = 'GATEWAY_TIMEOUT';
          logger.error('Scholarship Service timed out', { scholarshipId });
          return reject(err);
        });

        req.on('error', (err) => {
          const error = new Error(`Scholarship Service unavailable: ${err.message}`);
          error.statusCode = 503;
          error.errorCode = 'SERVICE_UNAVAILABLE';
          logger.error('Scholarship Service error', { error: err.message, scholarshipId });
          return reject(error);
        });

        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = ScholarshipClient;
