const ApplicationPostgresModel = require('../models/applicationPostgresModel');
const ApplicationMongoModel = require('../models/applicationMongoModel');
const StudentServiceClient = require('../clients/studentServiceClient');
const ScholarshipServiceClient = require('../clients/scholarshipServiceClient');
const logger = require('../config/logger');

// Valid state transitions
const VALID_TRANSITIONS = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['CORRECTION_REQUIRED', 'APPROVED', 'REJECTED'],
  CORRECTION_REQUIRED: ['UNDER_REVIEW', 'REJECTED'],
  APPROVED: ['DISBURSED'],
  REJECTED: [],
  DISBURSED: [],
};

// Progress percentage mapping
const STATUS_PROGRESS = {
  DRAFT: 10,
  SUBMITTED: 25,
  UNDER_REVIEW: 50,
  CORRECTION_REQUIRED: 40,
  APPROVED: 90,
  DISBURSED: 100,
  REJECTED: 100,
};

class ApplicationService {
  /**
   * Submit new scholarship application
   */
  static async submitApplication({ studentId, scholarshipId, statement, sop, userContext = {}, token }) {
    // 1. Verify student identity with Auth/Student service
    const studentVerification = await StudentServiceClient.verifyStudent(studentId, token);
    if (!studentVerification.verified) {
      const err = new Error(studentVerification.error || 'Student verification failed.');
      err.statusCode = 401;
      throw err;
    }

    // 2. Check for duplicate application
    const existing = await ApplicationPostgresModel.findExisting(studentId, scholarshipId);
    if (existing) {
      const err = new Error('You have already applied for this scholarship program.');
      err.statusCode = 409;
      err.existing_application_id = existing.application_id;
      throw err;
    }

    // 3. Verify scholarship eligibility through Scholarship Service API
    const studentContext = {
      cgpa: userContext.cgpa,
      annual_income: userContext.annual_income,
    };
    const schVerification = await ScholarshipServiceClient.verifyScholarship(scholarshipId, studentContext);

    // 4. Create application record and initial status in PostgreSQL
    const application = await ApplicationPostgresModel.create({
      studentId,
      scholarshipId,
      statement: statement || sop,
      sop: sop || statement,
    });

    // 5. Store snapshot and flexible form data in MongoDB
    await ApplicationMongoModel.saveSnapshot({
      applicationId: application.application_id,
      studentId,
      scholarshipId,
      payload: { statement, sop, ...userContext },
      scholarshipContext: schVerification.scholarship,
      studentContext: studentVerification.student || {},
    });

    return {
      application,
      scholarship: schVerification.scholarship,
      status: application.status,
      ...(schVerification.warning ? { warning: schVerification.warning } : {}),
    };
  }

  /**
   * Get applications for authenticated student
   */
  static async getStudentApplications(studentId) {
    const apps = await ApplicationPostgresModel.findByStudentId(studentId);
    return apps;
  }

  /**
   * Get application details by ID
   */
  static async getApplicationById(applicationId) {
    const application = await ApplicationPostgresModel.findById(applicationId);
    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    const [statusHistory, documents, snapshot] = await Promise.all([
      ApplicationPostgresModel.getStatusHistory(applicationId),
      ApplicationPostgresModel.getDocumentsByApplicationId(applicationId),
      ApplicationMongoModel.getSnapshot(applicationId),
    ]);

    return {
      application,
      statusHistory,
      documents,
      snapshot: snapshot?.submission_payload || null,
      scholarshipContext: snapshot?.scholarship_context || null,
    };
  }

  /**
   * Query applications (Admin/Reviewer)
   */
  static async getAllApplications(queryOptions) {
    return await ApplicationPostgresModel.findAll(queryOptions);
  }

  /**
   * Update application statement / SOP (permitted in DRAFT or CORRECTION_REQUIRED)
   */
  static async updateApplication(applicationId, studentId, updates) {
    const application = await ApplicationPostgresModel.findById(applicationId);
    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    // Only allow student updates when status is editable
    const editableStatuses = ['DRAFT', 'CORRECTION_REQUIRED', 'SUBMITTED'];
    if (!editableStatuses.includes(application.status)) {
      const err = new Error(`Application cannot be modified while in status '${application.status}'.`);
      err.statusCode = 400;
      throw err;
    }

    const updated = await ApplicationPostgresModel.update(applicationId, {
      statement: updates.statement || updates.sop,
      sop: updates.sop || updates.statement,
    });

    // Auto-advance to UNDER_REVIEW only when correcting from CORRECTION_REQUIRED
    if (application.status === 'CORRECTION_REQUIRED') {
      await ApplicationPostgresModel.updateStatus(applicationId, {
        newStatus: 'UNDER_REVIEW',
        comment: 'Applicant resubmitted after correction',
        changedBy: 'STUDENT',
      });
      // Return fresh copy reflecting new status
      return { ...updated, status: 'UNDER_REVIEW' };
    }

    return updated;
  }

  /**
   * Transition application status (Admin/Reviewer)
   */
  static async updateStatus(applicationId, { newStatus, comment, changedBy = 'ADMIN', reviewerId = null }) {
    const application = await ApplicationPostgresModel.findById(applicationId);
    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    const oldStatus = application.status;
    const allowedNext = VALID_TRANSITIONS[oldStatus] || [];

    if (!allowedNext.includes(newStatus)) {
      const err = new Error(`Invalid status transition from '${oldStatus}' to '${newStatus}'. Allowed: [${allowedNext.join(', ')}]`);
      err.statusCode = 400;
      throw err;
    }

    const updatedApp = await ApplicationPostgresModel.updateStatus(applicationId, {
      newStatus,
      comment,
      changedBy,
      reviewerId,
    });

    return {
      success: true,
      applicationId,
      oldStatus,
      newStatus,
      updated_at: updatedApp.updated_at,
    };
  }

  /**
   * Track application progress and return timeline
   */
  static async trackApplication(applicationId) {
    const application = await ApplicationPostgresModel.findById(applicationId);
    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    const history = await ApplicationPostgresModel.getStatusHistory(applicationId);
    const documents = await ApplicationPostgresModel.getDocumentsByApplicationId(applicationId);

    // Calculate stage information
    const currentStatus = application.status;
    const progress = STATUS_PROGRESS[currentStatus] || 0;

    let nextStepMessage = '';
    switch (currentStatus) {
      case 'SUBMITTED':
        nextStepMessage = 'Your application has been received and queued for committee review.';
        break;
      case 'UNDER_REVIEW':
        nextStepMessage = 'Your application is currently being scrutinized by the evaluation board.';
        break;
      case 'CORRECTION_REQUIRED':
        nextStepMessage = 'Action required: Please review reviewer feedback and upload corrected documents.';
        break;
      case 'APPROVED':
        nextStepMessage = 'Congratulations! Your scholarship grant has been approved and queued for disbursement.';
        break;
      case 'DISBURSED':
        nextStepMessage = 'Scholarship grant funds have been successfully disbursed.';
        break;
      case 'REJECTED':
        nextStepMessage = 'Application closed. Eligibility criteria or requirements were not met.';
        break;
      default:
        nextStepMessage = 'Processing application.';
    }

    const timeline = history.map((h) => ({
      status: h.status,
      timestamp: h.changed_at,
      changed_by: h.changed_by,
      comment: h.comment,
    }));

    return {
      application_id: application.application_id,
      student_id: application.student_id,
      scholarship_id: application.scholarship_id,
      current_status: currentStatus,
      progress_percentage: progress,
      next_step: nextStepMessage,
      submitted_at: application.submitted_at,
      updated_at: application.updated_at,
      documents_count: documents.length,
      verified_documents_count: documents.filter((d) => d.verification_status === 'VERIFIED').length,
      timeline,
    };
  }

  /**
   * Upload document attachment
   */
  static async uploadDocument({ applicationId, requirementId, file, documentName }) {
    const application = await ApplicationPostgresModel.findById(applicationId);
    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    // Save in PostgreSQL
    const doc = await ApplicationPostgresModel.saveDocument({
      applicationId,
      requirementId: requirementId || 1,
      documentPath: file.filename,
      originalName: file.originalname,
      documentName: documentName || file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    // Save rich metadata in MongoDB
    await ApplicationMongoModel.saveDocumentMetadata({
      applicationId,
      documentId: doc.application_document_id || doc.document_id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      extraMeta: {
        destination: file.destination,
        filename: file.filename,
      },
    });

    return doc;
  }

  /**
   * Get document for download
   */
  static async getDocumentForDownload(docId) {
    const doc = await ApplicationPostgresModel.getDocumentById(docId);
    if (!doc) {
      const err = new Error('Document not found');
      err.statusCode = 404;
      throw err;
    }
    return doc;
  }

  /**
   * Verify document (Admin/Reviewer)
   */
  static async verifyDocument(docId, { verificationStatus, reviewerComment, verifiedBy }) {
    const updated = await ApplicationPostgresModel.updateDocumentVerification(docId, {
      verificationStatus,
      reviewerComment,
      verifiedBy,
    });
    if (!updated) {
      const err = new Error('Document not found');
      err.statusCode = 404;
      throw err;
    }
    return updated;
  }
}

module.exports = ApplicationService;

