const ApplicationService = require('../services/application.service');
const StatusRepository = require('../repositories/status.repository');
const AuditRepository = require('../repositories/audit.repository');
const RequirementRepository = require('../repositories/requirement.repository');
const ApiResponse = require('../utils/api-response');

class ApplicationController {
  /**
   * POST /api/v1/applications (Submit or Draft based on body.status)
   */
  static async submitApplication(req, res, next) {
    try {
      const idempotencyKey = req.headers['idempotency-key'] || null;
      const result = await ApplicationService.submitApplication(req.user, req.body, idempotencyKey);
      return ApiResponse.created(res, 'Application created successfully', result.body);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/applications/draft (Explicit Draft creation)
   */
  static async createDraft(req, res, next) {
    try {
      const result = await ApplicationService.createDraft(req.user, req.body);
      return ApiResponse.created(res, 'Application draft created successfully', result.body);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/applications/:id/submit (Submit draft)
   */
  static async submitDraft(req, res, next) {
    try {
      const result = await ApplicationService.submitDraft(req.params.id, req.user);
      return ApiResponse.success(res, 'Application submitted successfully', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/applications/:id/answers (Save dynamic form answers)
   */
  static async saveAnswers(req, res, next) {
    try {
      const answers = req.body.answers || [];
      const saved = await ApplicationService.saveFormAnswers(req.params.id, req.user, answers);
      return ApiResponse.success(res, 'Form answers saved successfully', { answers: saved });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/:id/answers (Retrieve saved form answers)
   */
  static async getAnswers(req, res, next) {
    try {
      const answers = await ApplicationService.getFormAnswers(req.params.id, req.user);
      return ApiResponse.success(res, 'Form answers retrieved successfully', { answers });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/:id/requirements (Retrieve document requirements snapshot)
   */
  static async getRequirements(req, res, next) {
    try {
      await ApplicationService.getApplicationById(req.params.id, req.user);
      const requirements = await RequirementRepository.getByApplicationId(req.params.id);
      return ApiResponse.success(res, 'Document requirements retrieved successfully', { requirements });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/:id/audit-logs (Retrieve audit log trail)
   */
  static async getAuditLogs(req, res, next) {
    try {
      await ApplicationService.getApplicationById(req.params.id, req.user);
      const auditLogs = await AuditRepository.getByApplicationId(req.params.id);
      return ApiResponse.success(res, 'Audit logs retrieved successfully', { auditLogs });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/my (and GET /api/v1/applications for students)
   */
  static async getMyApplications(req, res, next) {
    try {
      if (req.user.role !== 'student' && !req.path.includes('/my')) {
        return ApplicationController.getAllApplications(req, res, next);
      }

      const applications = await ApplicationService.getStudentApplications(req.user.id, req.query);
      return ApiResponse.success(res, 'Student applications retrieved successfully', { applications });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/:id
   */
  static async getApplicationById(req, res, next) {
    try {
      const result = await ApplicationService.getApplicationById(req.params.id, req.user);
      return ApiResponse.success(res, 'Application details retrieved successfully', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/applications/:id
   */
  static async updateApplication(req, res, next) {
    try {
      const application = await ApplicationService.updateApplication(req.params.id, req.user, req.body);
      return ApiResponse.success(res, 'Application updated successfully', { application });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/applications/:id/withdraw
   */
  static async withdrawApplication(req, res, next) {
    try {
      const remarks = req.body?.remarks || req.body?.comment || 'Application withdrawn by applicant';
      const result = await ApplicationService.withdrawApplication(req.params.id, req.user, remarks);
      return ApiResponse.success(res, 'Application withdrawn successfully', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/:id/status-history (and :id/history)
   */
  static async getStatusHistory(req, res, next) {
    try {
      await ApplicationService.getApplicationById(req.params.id, req.user);
      const history = await StatusRepository.getByApplicationId(req.params.id);
      return ApiResponse.success(res, 'Status history retrieved successfully', { history });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/:id/track (and /tracking)
   */
  static async trackApplication(req, res, next) {
    try {
      const tracking = await ApplicationService.trackApplication(req.params.id, req.user);
      return ApiResponse.success(res, 'Application tracking retrieved successfully', { tracking });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/applications/:id/status (Admin / Reviewer)
   */
  static async updateStatus(req, res, next) {
    try {
      const { status, comment, remarks } = req.body;
      const result = await ApplicationService.updateStatus(
        req.params.id,
        req.user,
        status,
        remarks || comment || `Status updated to ${status}`
      );
      return ApiResponse.success(res, `Application status updated to ${status}`, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/admin/all
   */
  static async getAllApplications(req, res, next) {
    try {
      const { status, scholarship_id, page = 1, limit = 20, sort = 'DESC' } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const result = await ApplicationService.getAllApplications(
        { status, scholarship_id },
        { limit: parseInt(limit, 10), offset, sort }
      );

      return ApiResponse.success(res, 'Applications retrieved successfully', {
        total: result.total,
        page: parseInt(page, 10),
        limit: result.limit,
        applications: result.applications,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ApplicationController;
