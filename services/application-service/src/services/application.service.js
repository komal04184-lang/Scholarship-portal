const { getClient } = require('../config/database');
const ApplicationRepository = require('../repositories/application.repository');
const StatusRepository = require('../repositories/status.repository');
const DocumentRepository = require('../repositories/document.repository');
const EligibilityService = require('./eligibility.service');
const { StatusService, STATUSES } = require('./status.service');
const ReviewClient = require('../clients/review.client');
const logger = require('../utils/logger');

class ApplicationService {
  /**
   * Submit a new scholarship application
   */
  static async submitApplication(user, payload, idempotencyKey = null) {
    const studentId = user.id;

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
      const err = new Error('You have already applied for this scholarship program.');
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

    // 4. Save Application in Transaction
    const dbClient = await getClient();
    let application = null;

    try {
      await dbClient.query('BEGIN');

      application = await ApplicationRepository.create(
        {
          student_id: studentId,
          scholarship_id: payload.scholarship_id,
          statement: payload.statement || payload.sop,
          sop: payload.sop || payload.statement,
          academic_year: payload.academic_year || scholarship.academic_year || '2026-2027',
          status: STATUSES.SUBMITTED,
        },
        dbClient
      );

      // Record initial audit event
      await StatusService.recordTransition(
        application.application_id,
        null,
        STATUSES.SUBMITTED,
        user,
        payload.statement ? payload.statement.substring(0, 200) : 'Application submitted by student',
        dbClient
      );

      await dbClient.query('COMMIT');
    } catch (err) {
      await dbClient.query('ROLLBACK');
      throw err;
    } finally {
      dbClient.release();
    }

    // 5. Save Snapshot to MongoDB (Async non-blocking)
    ApplicationRepository.saveSnapshot(application.application_id, {
      application_id: application.application_id,
      application_number: application.application_number,
      student_id: studentId,
      scholarship_id: payload.scholarship_id,
      scholarship,
      submission_data: payload,
      submitted_at: application.submitted_at,
    }).catch((e) => logger.warn(`MongoDB snapshot warning: ${e.message}`));

    // 6. Notify Review Service Event (Async non-blocking)
    ReviewClient.notifyApplicationSubmitted({
      applicationId: application.application_id,
      applicationNumber: application.application_number,
      studentId,
      scholarshipId: payload.scholarship_id,
      submittedAt: application.submitted_at,
    }).catch(() => {});

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

    // 7. Store Idempotency Record
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
      const err = new Error('Access denied: You do not have permission to access or modify this application.');
      err.statusCode = 403;
      err.errorCode = 'ACCESS_DENIED';
      throw err;
    }

    // Fetch related documents and status history
    const [documents, statusHistory, snapshot] = await Promise.all([
      DocumentRepository.findByApplicationId(application.application_id),
      StatusRepository.getByApplicationId(application.application_id),
      ApplicationRepository.getSnapshot(application.application_id),
    ]);

    // Attach documents to application object for backward compatibility
    application.documents = documents.map((d) => ({
      application_document_id: d.application_document_id,
      requirement_id: d.requirement_id,
      document_id: d.document_id,
      document_name: d.document_name,
      original_name: d.original_name,
      document_path: d.document_path,
      mime_type: d.mime_type,
      file_size: d.file_size,
      verification_status: d.verification_status,
      reviewer_comment: d.reviewer_comment,
      uploaded_at: d.uploaded_at,
    }));

    return {
      application,
      statusHistory,
      documents,
      snapshot: snapshot ? snapshot.payload : null,
      scholarshipContext: snapshot?.payload?.scholarship || null,
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
      const err = new Error('Access denied: You do not have permission to access or modify this application.');
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

    updates.last_updated_by = user.id;
    const updated = await ApplicationRepository.update(application.application_id, updates);

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
      const err = new Error('Access denied: You do not have permission to access or modify this application.');
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
      const err = new Error('Access denied: You do not have permission to access or modify this application.');
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

