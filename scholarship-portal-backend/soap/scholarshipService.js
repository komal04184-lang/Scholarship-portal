const ScholarshipModel = require('../models/scholarshipModel');
const EligibilityService = require('../services/eligibilityService');

const scholarshipService = {
  ScholarshipPort: {
    GetScholarship: async (args) => {
      const id = args.scholarship_id;
      const sch = await ScholarshipModel.findById(id);
      if (!sch) {
        return { status: 'NOT_FOUND', scholarship: null };
      }
      return {
        status: 'SUCCESS',
        scholarship: {
          scholarship_id: sch.scholarship_id,
          name: sch.name,
          description: sch.description || '',
          amount: parseFloat(sch.amount),
          status: sch.status,
          deadline: sch.deadline ? sch.deadline.toISOString().split('T')[0] : '',
          minimum_cgpa: sch.minimum_cgpa ? parseFloat(sch.minimum_cgpa) : 0,
          maximum_income: sch.maximum_income ? parseFloat(sch.maximum_income) : 0,
          eligible_course: sch.eligible_course || '',
          eligible_category: sch.eligible_category || '',
        },
      };
    },

    ListScholarships: async (args) => {
      const status = args.status || 'ACTIVE';
      const result = await ScholarshipModel.findAll({ status, limit: 100, offset: 0 });
      return {
        total: result.total,
        scholarships: result.scholarships.map((s) => ({
          scholarship_id: s.scholarship_id,
          name: s.name,
          description: s.description || '',
          amount: parseFloat(s.amount),
          status: s.status,
          deadline: s.deadline ? s.deadline.toISOString().split('T')[0] : '',
          minimum_cgpa: s.minimum_cgpa ? parseFloat(s.minimum_cgpa) : 0,
          maximum_income: s.maximum_income ? parseFloat(s.maximum_income) : 0,
          eligible_course: s.eligible_course || '',
          eligible_category: s.eligible_category || '',
        })),
      };
    },

    CheckEligibility: async (args) => {
      try {
        const studentId = args.student_id;
        const scholarshipId = args.scholarship_id;
        const res = await EligibilityService.evaluate(studentId, scholarshipId);
        return {
          eligible: res.eligible,
          message: res.eligible ? 'Student meets all criteria' : `Missing/unmet: ${res.missing.join(', ')}`,
        };
      } catch (err) {
        return {
          eligible: false,
          message: err.message,
        };
      }
    },
  },
};

module.exports = scholarshipService;
