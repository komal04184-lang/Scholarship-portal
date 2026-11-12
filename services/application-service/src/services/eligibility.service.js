const ScholarshipClient = require('../clients/scholarship.client');
const logger = require('../utils/logger');

class EligibilityService {
  /**
   * Verify scholarship availability and student eligibility
   * @param {string|number} scholarshipId
   * @param {object} studentProfile
   * @returns {Promise<{ eligible: boolean, scholarship: object, reason?: string }>}
   */
  static async verifyScholarshipAndEligibility(scholarshipId, studentProfile = null) {
    const scholarship = await ScholarshipClient.getScholarship(scholarshipId);

    // 1. Verify scholarship active status
    if (scholarship.status && scholarship.status.toUpperCase() !== 'ACTIVE') {
      const err = new Error(`Scholarship '${scholarship.name || scholarshipId}' is currently inactive.`);
      err.statusCode = 400;
      err.errorCode = 'SCHOLARSHIP_INACTIVE';
      throw err;
    }

    // 2. Verify application deadline
    if (scholarship.deadline) {
      const deadlineDate = new Date(scholarship.deadline);
      const now = new Date();
      if (!isNaN(deadlineDate.getTime()) && deadlineDate < now) {
        const err = new Error(`The application deadline for '${scholarship.name || scholarshipId}' has passed (${scholarship.deadline}).`);
        err.statusCode = 400;
        err.errorCode = 'SCHOLARSHIP_DEADLINE_EXPIRED';
        throw err;
      }
    }

    // 3. Verify student eligibility criteria if provided
    if (studentProfile && scholarship.eligibility_criteria) {
      const criteria = scholarship.eligibility_criteria;

      // Income limit check
      if (criteria.max_family_income && studentProfile.family_income) {
        if (Number(studentProfile.family_income) > Number(criteria.max_family_income)) {
          const err = new Error(
            `Applicant family income (${studentProfile.family_income}) exceeds scholarship threshold (${criteria.max_family_income}).`
          );
          err.statusCode = 400;
          err.errorCode = 'INCOME_ELIGIBILITY_EXCEEDED';
          throw err;
        }
      }

      // Minimum percentage check
      if (criteria.min_marks_percentage && studentProfile.academic_details?.marks_percentage) {
        if (Number(studentProfile.academic_details.marks_percentage) < Number(criteria.min_marks_percentage)) {
          const err = new Error(
            `Academic marks (${studentProfile.academic_details.marks_percentage}%) do not meet minimum required (${criteria.min_marks_percentage}%).`
          );
          err.statusCode = 400;
          err.errorCode = 'ACADEMIC_ELIGIBILITY_NOT_MET';
          throw err;
        }
      }
    }

    return {
      eligible: true,
      scholarship,
    };
  }
}

module.exports = EligibilityService;

