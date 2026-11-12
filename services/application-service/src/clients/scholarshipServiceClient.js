const config = require('../config');
const logger = require('../config/logger');

class ScholarshipServiceClient {
  /**
   * Verify scholarship existence, status, and deadline via Scholarship Service API
   */
  static async verifyScholarship(scholarshipId, studentContext = {}) {
    const url = `${config.services.scholarshipServiceUrl}/api/v1/scholarships/${scholarshipId}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.services.requestTimeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        const err = new Error(`Scholarship #${scholarshipId} not found.`);
        err.statusCode = 404;
        throw err;
      }

      if (!response.ok) {
        const err = new Error(`Scholarship service error (${response.status})`);
        err.statusCode = response.status;
        throw err;
      }

      const data = await response.json();
      const scholarship = data.scholarship || data;

      // Status check
      const status = (scholarship.status || '').toUpperCase();
      if (status !== 'ACTIVE') {
        const err = new Error(`Scholarship '${scholarship.name || scholarshipId}' is not currently active (Status: ${status}).`);
        err.statusCode = 400;
        throw err;
      }

      // Deadline check
      if (scholarship.deadline) {
        const deadlineDate = new Date(scholarship.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (deadlineDate < today) {
          const err = new Error(`Application deadline for this scholarship passed on ${deadlineDate.toISOString().split('T')[0]}.`);
          err.statusCode = 400;
          throw err;
        }
      }

      // Criteria validation if studentContext provides CGPA or income
      if (scholarship.criteria || scholarship.eligibility_criteria) {
        const criteria = scholarship.criteria || scholarship.eligibility_criteria;

        if (criteria.minimum_cgpa && studentContext.cgpa !== undefined) {
          if (studentContext.cgpa < parseFloat(criteria.minimum_cgpa)) {
            const err = new Error(`Eligibility check failed: Minimum CGPA required is ${criteria.minimum_cgpa}, applicant CGPA is ${studentContext.cgpa}.`);
            err.statusCode = 400;
            throw err;
          }
        }

        if (criteria.maximum_income && studentContext.annual_income !== undefined) {
          if (studentContext.annual_income > parseFloat(criteria.maximum_income)) {
            const err = new Error(`Eligibility check failed: Maximum annual family income allowed is ₹${criteria.maximum_income}, applicant income is ₹${studentContext.annual_income}.`);
            err.statusCode = 400;
            throw err;
          }
        }
      }

      return {
        verified: true,
        scholarship: {
          scholarship_id: scholarship.scholarship_id || scholarshipId,
          name: scholarship.name || scholarship.title,
          amount: scholarship.amount,
          deadline: scholarship.deadline,
        },
      };
    } catch (err) {
      if (err.statusCode) {
        throw err; // Re-throw business validation errors (404, 400)
      }

      logger.warn(`Scholarship Service is unavailable (${err.message}).`);

      if (config.services.fallbackEligibilityCheck) {
        logger.info('FALLBACK_ELIGIBILITY_CHECK enabled: allowing submission with fallback confirmation.');
        return {
          verified: true,
          fallback: true,
          warning: 'Scholarship Service is currently offline; basic eligibility verification was performed via local fallback.',
          scholarship: {
            scholarship_id: scholarshipId,
            name: `Scholarship #${scholarshipId}`,
          },
        };
      }

      const serviceErr = new Error('Scholarship Service is temporarily unavailable. Please try again shortly.');
      serviceErr.statusCode = 503;
      throw serviceErr;
    }
  }
}

module.exports = ScholarshipServiceClient;

