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
    const status = String(scholarship.status || '').toUpperCase();
    const activeStatuses = ['ACTIVE', 'OPEN', 'PUBLISHED'];
    if (status && !activeStatuses.includes(status)) {
      const err = new Error(`Scholarship '${scholarship.name || scholarship.title || scholarshipId}' is currently inactive (${scholarship.status}).`);
      err.statusCode = 400;
      err.errorCode = 'SCHOLARSHIP_INACTIVE';
      throw err;
    }

    // 2. Verify application deadline
    const deadlineStr = scholarship.deadline || scholarship.application_end_date;
    if (deadlineStr) {
      const deadlineDate = new Date(deadlineStr);
      const now = new Date();
      if (!isNaN(deadlineDate.getTime()) && deadlineDate < now) {
        const err = new Error(`The application deadline for '${scholarship.name || scholarship.title || scholarshipId}' has passed (${deadlineStr}).`);
        err.statusCode = 400;
        err.errorCode = 'SCHOLARSHIP_DEADLINE_EXPIRED';
        throw err;
      }
    }

    // 3. Verify student eligibility criteria if provided
    if (studentProfile) {
      // Income check
      const maxIncome = scholarship.max_income ?? scholarship.eligibility_criteria?.max_family_income;
      const studentIncome = studentProfile.family_income ?? studentProfile.annual_income ?? studentProfile.income;
      if (maxIncome !== null && maxIncome !== undefined && studentIncome !== null && studentIncome !== undefined) {
        if (Number(studentIncome) > Number(maxIncome)) {
          const err = new Error(
            `Applicant family income (₹${studentIncome}) exceeds scholarship threshold of ₹${maxIncome}.`
          );
          err.statusCode = 400;
          err.errorCode = 'INCOME_ELIGIBILITY_EXCEEDED';
          throw err;
        }
      }

      // Minimum academic performance check
      const minPercentage = scholarship.min_percentage ?? scholarship.eligibility_criteria?.min_marks_percentage;
      const minCgpa = scholarship.min_cgpa ?? scholarship.eligibility_criteria?.min_cgpa;
      const studentMarks = studentProfile.academic_details?.marks_percentage ?? studentProfile.marks_percentage ?? studentProfile.percentage;
      const studentCgpa = studentProfile.academic_details?.cgpa ?? studentProfile.cgpa;

      if (minPercentage !== null && minPercentage !== undefined && studentMarks !== null && studentMarks !== undefined) {
        if (Number(studentMarks) < Number(minPercentage)) {
          const err = new Error(
            `Academic marks (${studentMarks}%) do not meet minimum required percentage (${minPercentage}%).`
          );
          err.statusCode = 400;
          err.errorCode = 'ACADEMIC_ELIGIBILITY_NOT_MET';
          throw err;
        }
      }

      if (minCgpa !== null && minCgpa !== undefined && studentCgpa !== null && studentCgpa !== undefined) {
        if (Number(studentCgpa) < Number(minCgpa)) {
          const err = new Error(
            `CGPA (${studentCgpa}) does not meet minimum required CGPA (${minCgpa}).`
          );
          err.statusCode = 400;
          err.errorCode = 'CGPA_ELIGIBILITY_NOT_MET';
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
