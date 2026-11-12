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
          if (env.services.fallbackEligibilityCheck) {
            logger.warn(`Scholarship Service timed out; applying resilient fallback for scholarship ${scholarshipId}`);
            return resolve(ScholarshipClient._getFallbackScholarship(scholarshipId));
          }
          const err = new Error('Scholarship Service request timed out.');
          err.statusCode = 504;
          return reject(err);
        });

        req.on('error', (err) => {
          if (env.services.fallbackEligibilityCheck) {
            logger.warn(`Scholarship Service unreachable (${err.message}); applying resilient fallback for scholarship ${scholarshipId}`);
            return resolve(ScholarshipClient._getFallbackScholarship(scholarshipId));
          }
          const error = new Error(`Scholarship Service unavailable: ${err.message}`);
          error.statusCode = 503;
          return reject(error);
        });

        req.end();
      } catch (err) {
        if (env.services.fallbackEligibilityCheck) {
          return resolve(ScholarshipClient._getFallbackScholarship(scholarshipId));
        }
        reject(err);
      }
    });
  }

  static _getFallbackScholarship(id) {
    return {
      scholarship_id: id,
      name: `Scholarship Program #${id}`,
      amount: '50000.00',
      status: 'ACTIVE',
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      academic_year: '2026-2027',
      fallback: true,
    };
  }
}

module.exports = ScholarshipClient;

