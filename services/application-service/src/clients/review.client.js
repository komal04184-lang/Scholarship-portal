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
   * Dispatches review record creation to POST /api/reviews
   * @param {object} payload - { applicationId, studentId, scholarshipId, submittedAt, documents }
   */
  static async notifyApplicationSubmitted(payload) {
    const baseUrl = env.services.reviewServiceUrl;

    return new Promise((resolve) => {
      try {
        const urlObj = new URL('/api/reviews', baseUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        const reviewData = {
          applicationId: String(payload.applicationId),
          studentId: String(payload.studentId),
          scholarshipId: String(payload.scholarshipId),
          documents: Array.isArray(payload.documents) && payload.documents.length > 0
            ? payload.documents.map((d) => ({
                name: d.document_type || d.name || 'Document',
                status: 'PENDING',
                remarks: '',
              }))
            : [
                { name: 'Identity Proof', status: 'PENDING', remarks: '' },
                { name: 'Academic Marksheet', status: 'PENDING', remarks: '' },
                { name: 'Income Certificate', status: 'PENDING', remarks: '' },
              ],
        };

        const postData = JSON.stringify(reviewData);

        const req = protocol.request(
          urlObj,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'X-Service-Token': env.services.serviceToServiceSecret,
            },
            timeout: 3000,
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

  /**
   * Fetch review record by application ID
   */
  static async getReviewByApplication(applicationId) {
    const baseUrl = env.services.reviewServiceUrl;

    return new Promise((resolve) => {
      try {
        const urlObj = new URL(`/api/reviews/application/${encodeURIComponent(applicationId)}`, baseUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        const req = protocol.request(
          urlObj,
          {
            method: 'GET',
            headers: {
              'X-Service-Token': env.services.serviceToServiceSecret,
            },
            timeout: 3000,
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsed = JSON.parse(body);
                  resolve(parsed.data || null);
                } catch {
                  resolve(null);
                }
              } else {
                resolve(null);
              }
            });
          }
        );

        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.on('error', () => resolve(null));
        req.end();
      } catch {
        resolve(null);
      }
    });
  }
}

module.exports = ReviewClient;

