const http = require('http');
const https = require('https');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Review Service Client
 * Communicates with the Review Service (Port 3004)
 */
class ReviewClient {
  /**
   * Notifies Review Service of a new submitted application ready for scrutiny
   * @param {object} payload - { applicationId, studentId, scholarshipId, submittedAt }
   */
  static async notifyApplicationSubmitted(payload) {
    const baseUrl = env.services.reviewServiceUrl;

    return new Promise((resolve) => {
      try {
        const urlObj = new URL('/api/v1/reviews/events/application-submitted', baseUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        const postData = JSON.stringify(payload);

        const req = protocol.request(
          urlObj,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'X-Service-Token': env.services.serviceToServiceSecret,
            },
            timeout: 2000,
          },
          (res) => {
            logger.info(`Review service notified of application submission: ${payload.applicationId} (status: ${res.statusCode})`);
            resolve(true);
          }
        );

        req.on('timeout', () => {
          req.destroy();
          logger.warn(`Review service notification timed out for application: ${payload.applicationId}`);
          resolve(false);
        });

        req.on('error', (err) => {
          logger.warn(`Review service unreachable for event notification: ${err.message}`);
          resolve(false);
        });

        req.write(postData);
        req.end();
      } catch (err) {
        logger.warn(`Failed to dispatch review event: ${err.message}`);
        resolve(false);
      }
    });
  }
}

module.exports = ReviewClient;

