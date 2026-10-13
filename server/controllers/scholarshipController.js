const ScholarshipModel = require('../models/scholarshipModel');
const EligibilityService = require('../services/eligibilityService');

class ScholarshipController {
  static async getScholarships(req, res, next) {
    try {
      const { search, category, course, status, min_amount, max_amount, sort_by, sort_order, page = 1, limit = 20 } = req.query;

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const result = await ScholarshipModel.findAll({
        search,
        category,
        course,
        status,
        minAmount: min_amount,
        maxAmount: max_amount,
        sortBy: sort_by,
        sortOrder: sort_order,
        limit: parseInt(limit, 10),
        offset,
      });

      res.json({
        scholarships: result.scholarships,
        pagination: {
          total: result.total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(result.total / parseInt(limit, 10)),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getScholarshipById(req, res, next) {
    try {
      const { id } = req.params;
      const scholarship = await ScholarshipModel.findById(id);

      if (!scholarship) {
        return res.status(404).json({ error: 'Scholarship not found' });
      }

      const requiredDocs = await ScholarshipModel.getRequiredDocuments(id);

      res.json({
        scholarship,
        requiredDocuments: requiredDocs,
      });
    } catch (err) {
      next(err);
    }
  }

  static async checkEligibility(req, res, next) {
    try {
      const { id } = req.params;
      const studentId = req.user.id;

      const evalResult = await EligibilityService.evaluate(studentId, id);
      res.json(evalResult);
    } catch (err) {
      next(err);
    }
  }

  static async getFeatured(req, res, next) {
    try {
      const result = await ScholarshipModel.findAll({
        status: 'ACTIVE',
        sortBy: 'amount',
        sortOrder: 'DESC',
        limit: 6,
        offset: 0,
      });
      res.json({ scholarships: result.scholarships });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ScholarshipController;
