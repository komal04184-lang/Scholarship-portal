const ApplicationService = require('../services/application.service');
const ApiResponse = require('../utils/api-response');

class InternalController {
  /**
   * GET /internal/applications/:id
   */
  static async getApplication(req, res, next) {
    try {
      // Internal services bypass student-specific restrictions
      const serviceUser = { id: 'SERVICE', role: 'admin' };
      const result = await ApplicationService.getApplicationById(req.params.id, serviceUser);
      return ApiResponse.success(res, 'Internal application retrieved', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /internal/applications
   */
  static async searchApplications(req, res, next) {
    try {
      const { status, scholarship_id, page = 1, limit = 20, sort = 'DESC' } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const result = await ApplicationService.getAllApplications(
        { status, scholarship_id },
        { limit: parseInt(limit, 10), offset, sort }
      );

      return ApiResponse.success(res, 'Internal search results', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /internal/applications/:id/status
   */
  static async updateStatus(req, res, next) {
    try {
      const { status, remarks, caller_service } = req.body;
      const serviceUser = {
        id: caller_service || 'INTERNAL_SERVICE',
        role: 'admin',
      };

      const result = await ApplicationService.updateStatus(
        req.params.id,
        serviceUser,
        status,
        remarks || `Status updated via internal service call by ${caller_service || 'service'}`
      );

      return ApiResponse.success(res, `Internal status transition applied: ${status}`, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InternalController;

