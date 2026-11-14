const { getClient } = require('../config/database');
const ApplicationRepository = require('../repositories/application.repository');
const StatusRepository = require('../repositories/status.repository');
const DocumentRepository = require('../repositories/document.repository');
const AnswerRepository = require('../repositories/answer.repository');
const RequirementRepository = require('../repositories/requirement.repository');
const AuditRepository = require('../repositories/audit.repository');
const OutboxRepository = require('../repositories/outbox.repository');
const EligibilityService = require('./eligibility.service');
const { StatusService, STATUSES } = require('./status.service');
const ReviewClient = require('../clients/review.client');
const logger = require('../utils/logger');

class ApplicationService {
  /**
   * Submit or draft a new scholarship application
   */
  static async submitApplication(user, payload, idempotencyKey = null) {
    const studentId = String(user.id);
    const initialStatus = payload.status === 'DRAFT' ? STATUSES.DRAFT : STATUSES.SUBMITTED;

    // 1. Idempotency Check
    if (idempotencyKey) {
      const cached = await ApplicationRepository.getIdempotencyRecord(idempotencyKey);
      if (cached) {
        logger.info(`Idempotent request detected for key: ${idempotencyKey}`);
        return {
          fromCache: true,
          status: cached.response_status,
          body: cached.response_body,
        };
      }
    }

    // 2. Prevent Duplicate Application
    const existing = await ApplicationRepository.findExisting(studentId, payload.scholarship_id);
    if (existing) {
      const err = new Error('You have already created or submitted an application for this scholarship program.');
      err.statusCode = 409;
      err.errorCode = 'DUPLICATE_APPLICATION';
      err.details = { existing_application_id: existing.application_id, status: existing.status };
      throw err;
    }

    // 3. Verify Scholarship & Eligibility
    const { scholarship } = await EligibilityService.verifyScholarshipAndEligibility(
      payload.scholarship_id,
      payload
    );

    // 4. Save Application in Transaction (application_db)
    const dbClient = await getClient();
    let application = null;

    try {
      await dbClient.query('BEGIN');

      application = await ApplicationRepository.create(
        {
          student_id: studentId,
          scholarship_id: payload.scholarship_id,
          statement: payload.statement || payload.sop || '',
          sop: payload.sop || payload.statement || '',
          academic_year: payload.academic_year || scholarship.academic_year || '2026-2027',
          status: initialStatus,
          metadata: {
            scholarship_name: scholarship.name || scholarship.title,
            scholarship_amount: scholarship.amount,
            academic_details: payload.academic_details || {},
            ...(payload.metadata || {}),
          },
        },
        dbClient
      );

      // Snapshot Document Requirements if scholarship provided any
      const reqList = scholarship.required_documents || scholarship.requiredDocuments || [
        { name: 'Identity Proof', code: 'ID_PROOF', mandatory: true },
        { name: 'Academic Marksheet', code: 'MARKSHEET', mandatory: true },
        { name: 'Income Certificate', code: 'INCOME_CERT', mandatory: true },
      ];
      const normalizedReqs = reqList.map((r) =>
        typeof r === 'string'
          ? { requirement_name: r, requirement_code: r.toUpperCase().replace(/\s+/g, '_'), is_mandatory: true }
          : { requirement_name: r.name || r.document_name || 'Document', requirement_code: r.code || 'DOC', is_mandatory: r.mandatory !== false }
      );
      await RequirementRepository.createRequirements(application.application_id, normalizedReqs, dbClient);

      // Save dynamic answers if provided
      if (Array.isArray(payload.answers) && payload.answers.length > 0) {
        await AnswerRepository.saveAnswers(application.application_id, payload.answers, dbClient);
      }

      // Record initial audit event
      await StatusService.recordTransition(
        application.application_id,
        null,
        initialStatus,
        user,
        initialStatus === STATUSES.DRAFT ? 'Application draft created by student' : 'Application submitted by student',
        dbClient
      );

      // Record audit log
      await AuditRepository.recordLog(
        application.application_id,
        studentId,
        user.role || 'student',
        initialStatus === STATUSES.DRAFT ? 'APPLICATION_DRAFT_CREATED' : 'APPLICATION_SUBMITTED',
        `Application ${application.application_number} created with status ${initialStatus}`,
        { scholarship_id: payload.scholarship_id, academic_year: application.academic_year },
        dbClient
      );

      // Record outbox event for reliable microservice messaging
      await OutboxRepository.publishEvent(
        'APPLICATION',
        application.application_id,
        initialStatus === STATUSES.DRAFT ? 'ApplicationDraftCreated' : 'ApplicationSubmitted',
        {
          applicationId: application.application_id,
          applicationNumber: application.application_number,
          studentId,
          scholarshipId: payload.scholarship_id,
          status: initialStatus,
          timestamp: new Date().toISOString(),
        },
        dbClient
      );

      await dbClient.query('COMMIT');
    } catch (err) {
      await dbClient.query('ROLLBACK');
      throw err;
    } finally {
      dbClient.release();
    }

    // 5. If SUBMITTED, notify Review Service Event (Async non-blocking)
    if (initialStatus === STATUSES.SUBMITTED) {
      ReviewClient.notifyApplicationSubmitted({
        applicationId: application.application_id,
        applicationNumber: application.application_number,
        studentId,
        scholarshipId: payload.scholarship_id,
        submittedAt: application.submitted_at,
      }).catch(() => {});
    }

    const responseData = {
      application,
      scholarship: {
        scholarship_id: scholarship.scholarship_id,
        name: scholarship.name || scholarship.title,
        amount: scholarship.amount,
        deadline: scholarship.deadline,
      },
      status: application.status,
    };

    // 6. Store Idempotency Record in application_db
    if (idempotencyKey) {
      ApplicationRepository.saveIdempotencyRecord(
        idempotencyKey,
        studentId,
        null,
        201,
        responseData
      ).catch(() => {});
    }

    return {
      fromCache: false,
      status: 201,
      body: responseData,
    };
  }

  /**
   * Create a draft application
   */
  static async createDraft(user, payload) {
    return await this.submitApplication(user, { ...payload, status: 'DRAFT', statement: payload.statement || 'Draft application' });
  }

  /**
   * Submit an existing draft application
   */
  static async submitDraft(applicationId, user) {
    const application = await ApplicationRepository.findById(applicationId);
    if (!application) {
      const err = new Error(`Application #${applicationId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'APPLICATION_NOT_FOUND';
      throw err;
    }

    // Student Ownership Check
    if (user.role === 'student' && String(application.student_id) !== String(user.id)) {
      const err = new Error('Access denied: You do not have permission to submit this application.');
      err.statusCode = 403;
      err.errorCode = 'ACCESS_DENIED';
      throw err;
    }

    if (application.status !== STATUSES.DRAFT) {
      const err = new Error(`Application #${applicationId} is currently in '${application.status}' status, not 'DRAFT'.`);
      err.statusCode = 400;
      err.errorCode = 'INVALID_STATUS';
      throw err;
    }

    // Transition DRAFT -> SUBMITTED
    const updated = await this.updateStatus(
      application.application_id,
      user,
      STATUSES.SUBMITTED,
      'Applicant submitted the completed draft application.'
    );

    // Notify Review Service
    ReviewClient.notifyApplicationSubmitted({
      applicationId: application.application_id,
      applicationNumber: application.application_number,
      studentId: application.student_id,
      scholarshipId: application.scholarship_id,
      submittedAt: new Date(),
    }).catch(() => {});

    return updated;
  }

  /**
   * Save dynamic form answers
   */
  static async saveFormAnswers(applicationId, user, answers) {
    const application = await ApplicationRepository.findById(applicationId);
    if (!application) {
      const err = new Error(`Application #${applicationId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'APPLICATION_NOT_FOUND';
      throw err;
    }

    // Student Ownership Check
    if (user.role === 'student' && String(application.student_id) !== String(user.id)) {
      const err = new Error('Access denied: You cannot edit answers for this application.');
      err.statusCode = 403;
      err.errorCode = 'ACCESS_DENIED';
      throw err;
    }

    const saved = await AnswerRepository.saveAnswers(application.application_id, answers);

    await AuditRepository.recordLog(
      application.application_id,
      user.id,
      user.role || 'student',
      'FORM_ANSWERS_SAVED',
      `Saved ${saved.length} form answer(s)`,
      { answerCount: saved.length }
    );

    return saved;
  }

  /**
   * Get dynamic form answers
   */
  static async getFormAnswers(applicationId, user) {
    const application = await ApplicationRepository.findById(applicationId);
    if (!application) {
      const err = new Error(`Application #${applicationId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'APPLICATION_NOT_FOUND';
      throw err;
    }

    // Student Ownership Check
    if (user.role === 'student' && String(application.student_id) !== String(user.id)) {
      const err = new Error('Access denied.');
      err.statusCode = 403;
      err.errorCode = 'ACCESS_DENIED';
      throw err;
    }

    return await AnswerRepository.getAnswers(application.application_id);
  }

  /**
   * Retrieve applications for logged-in student
   */
  static async getStudentApplications(studentId, options = {}) {
    return await ApplicationRepository.findByStudentId(studentId, options);
  }

  /**
   * Retrieve single application by ID with full details
   */
  static async getApplicationById(applicationId, user) {
    const application = await ApplicationRepository.findById(applicationId);
    if (!application) {
      const err = new Error(`Application #${applicationId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'APPLICATION_NOT_FOUND';
      throw err;
    }

    // Student Ownership Check: Students can only view their own application
    if (user.role === 'student' && String(application.student_id) !== String(user.id)) {
      const err = new Error('Access denied: You do not have permission to access this application.');
      err.statusCode = 403;
      err.errorCode = 'ACCESS_DENIED';
      throw err;
    }

    // Fetch related records from PostgreSQL (application_db)
    const [documents, statusHistory, answers, requirements, auditLogs] = await Promise.all([
      DocumentRepository.findByApplicationId(application.application_id),
      StatusRepository.getByApplicationId(application.application_id),
      AnswerRepository.getAnswers(application.application_id),
      RequirementRepository.getByApplicationId(application.application_id),
      AuditRepository.getByApplicationId(application.application_id),
    ]);

    // Attach documents to application object for backward compatibility
    application.documents = documents.map((d) => ({
      application_document_id: d.id,
      id: d.id,
      requirement_id: d.requirement_id,
      document_name: d.document_type || d.original_filename,
      original_name: d.original_filename,
      document_path: d.storage_key,
      mime_type: d.mime_type,
      file_size: d.file_size_bytes,
      verification_status: d.verification_status,
      remarks: d.remarks,
      uploaded_at: d.uploaded_at,
    }));

    return {
      application,
      statusHistory,
      documents,
      answers,
      requirements,
      auditLogs,
      metadata: application.metadata || {},
    };
  }

  /**
   * Update permitted fields of an application
   */
  static async updateApplication(applicationId, user, updates) {
    const application = await ApplicationRepository.findById(applicationId);
    if (!application) {
      const err = new Error(`Application #${applicationId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'APPLICATION_NOT_FOUND';
      throw err;
    }

    // Student Ownership Check
    if (user.role === 'student' && String(application.student_id) !== String(user.id)) {
      const err = new Error('Access denied: You do not have permission to modify this application.');
      err.statusCode = 403;
      err.errorCode = 'ACCESS_DENIED';
      throw err;
    }

    // Editable status check
    const editableStatuses = [
      STATUSES.DRAFT,
      STATUSES.SUBMITTED,
      STATUSES.DOCUMENTS_REQUIRED,
      STATUSES.RESUBMISSION_REQUIRED,
      STATUSES.CORRECTION_REQUIRED,
    ];

    if (!editableStatuses.includes(application.status)) {
      const err = new Error(`Cannot update application in '${application.status}' status. Editing is closed.`);
      err.statusCode = 400;
      err.errorCode = 'APPLICATION_NOT_EDITABLE';
      throw err;
    }

    const updated = await ApplicationRepository.update(application.application_id, updates);

    await AuditRepository.recordLog(
      application.application_id,
      user.id,
      user.role || 'student',
      'APPLICATION_UPDATED',
      'Application statement or metadata updated by student',
      updates
    );

    // If application was in CORRECTION_REQUIRED or RESUBMISSION_REQUIRED, auto-advance back to UNDER_REVIEW
    if ([STATUSES.CORRECTION_REQUIRED, STATUSES.RESUBMISSION_REQUIRED].includes(application.status)) {
      await this.updateStatus(
        application.application_id,
        user,
        STATUSES.UNDER_REVIEW,
        'Applicant submitted corrections/resubmission details.'
      );
      updated.status = STATUSES.UNDER_REVIEW;
    }

    return updated;
  }

  /**
   * Withdraw an application
   */
  static async withdrawApplication(applicationId, user, remarks = 'Withdrawn by applicant') {
    const application = await ApplicationRepository.findById(applicationId);
    if (!application) {
      const err = new Error(`Application #${applicationId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'APPLICATION_NOT_FOUND';
      throw err;
    }

    // Student Ownership Check
    if (user.role === 'student' && String(application.student_id) !== String(user.id)) {
      const err = new Error('Access denied: You do not have permission to withdraw this application.');
      err.statusCode = 403;
      err.errorCode = 'ACCESS_DENIED';
      throw err;
    }

    // Cannot withdraw finished/approved applications
    const nonWithdrawable = [STATUSES.APPROVED, STATUSES.DISBURSED, STATUSES.COMPLETED, STATUSES.REJECTED, STATUSES.WITHDRAWN];
    if (nonWithdrawable.includes(application.status)) {
      const err = new Error(`Cannot withdraw application with status '${application.status}'.`);
      err.statusCode = 400;
      err.errorCode = 'CANNOT_WITHDRAW';
      throw err;
    }

    return await this.updateStatus(application.application_id, user, STATUSES.WITHDRAWN, remarks);
  }

  /**
   * Update application status (Admin / Reviewer / Internal service)
   */
  static async updateStatus(applicationId, user, newStatus, remarks) {
    const application = await ApplicationRepository.findById(applicationId);
    if (!application) {
      const err = new Error(`Application #${applicationId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'APPLICATION_NOT_FOUND';
      throw err;
    }

    const currentStatus = application.status;

    // Validate State Machine Transition
    if (!StatusService.isValidTransition(currentStatus, newStatus)) {
      const err = new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'.`);
      err.statusCode = 400;
      err.errorCode = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    const dbClient = await getClient();
    try {
      await dbClient.query('BEGIN');

      const updated = await ApplicationRepository.updateStatus(application.application_id, newStatus, dbClient);

      await StatusService.recordTransition(
        application.application_id,
        currentStatus,
        newStatus,
        user,
        remarks,
        dbClient
      );

      await AuditRepository.recordLog(
        application.application_id,
        user.id || 'SYSTEM',
        user.role || 'service',
        'STATUS_TRANSITION',
        `Status transitioned from ${currentStatus} to ${newStatus}. Remarks: ${remarks || 'None'}`,
        { oldStatus: currentStatus, newStatus },
        dbClient
      );

      await OutboxRepository.publishEvent(
        'APPLICATION',
        application.application_id,
        `ApplicationStatusChangedTo${newStatus}`,
        {
          applicationId: application.application_id,
          applicationNumber: application.application_number,
          oldStatus: currentStatus,
          newStatus,
          remarks,
          timestamp: new Date().toISOString(),
        },
        dbClient
      );

      await dbClient.query('COMMIT');

      return {
        applicationId: application.application_id,
        applicationNumber: application.application_number,
        oldStatus: currentStatus,
        newStatus,
        updated_at: updated.updated_at,
      };
    } catch (err) {
      await dbClient.query('ROLLBACK');
      throw err;
    } finally {
      dbClient.release();
    }
  }

  /**
   * List all applications with pagination and filters
   */
  static async getAllApplications(filters, options) {
    return await ApplicationRepository.findAll(filters, options);
  }

  /**
   * Track application progress and history
   */
  static async trackApplication(applicationId, user) {
    const application = await ApplicationRepository.findById(applicationId);
    if (!application) {
      const err = new Error(`Application #${applicationId} was not found.`);
      err.statusCode = 404;
      err.errorCode = 'APPLICATION_NOT_FOUND';
      throw err;
    }

    // Student Ownership Check
    if (user.role === 'student' && String(application.student_id) !== String(user.id)) {
      const err = new Error('Access denied: You do not have permission to access this application.');
      err.statusCode = 403;
      err.errorCode = 'ACCESS_DENIED';
      throw err;
    }

    const tracking = await StatusService.getTracking(application);

    // Also include document verification counts
    const documents = await DocumentRepository.findByApplicationId(application.application_id);
    tracking.documents_count = documents.length;
    tracking.verified_documents_count = documents.filter((d) => d.verification_status === 'VERIFIED').length;

    return tracking;
  }
}

module.exports = ApplicationService;
