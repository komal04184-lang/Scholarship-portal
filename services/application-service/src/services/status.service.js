const StatusRepository = require('../repositories/status.repository');
const logger = require('../utils/logger');

// Lifecycle status definitions
const STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  DOCUMENTS_REQUIRED: 'DOCUMENTS_REQUIRED',
  RESUBMISSION_REQUIRED: 'RESUBMISSION_REQUIRED',
  CORRECTION_REQUIRED: 'CORRECTION_REQUIRED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  COMPLETED: 'COMPLETED',
  DISBURSED: 'DISBURSED',
  WITHDRAWN: 'WITHDRAWN',
};

// Allowed State Machine Transitions
const ALLOWED_TRANSITIONS = {
  DRAFT: [STATUSES.SUBMITTED, STATUSES.WITHDRAWN],
  SUBMITTED: [
    STATUSES.UNDER_REVIEW,
    STATUSES.DOCUMENTS_REQUIRED,
    STATUSES.REJECTED,
    STATUSES.WITHDRAWN,
  ],
  UNDER_REVIEW: [
    STATUSES.DOCUMENTS_REQUIRED,
    STATUSES.RESUBMISSION_REQUIRED,
    STATUSES.CORRECTION_REQUIRED,
    STATUSES.APPROVED,
    STATUSES.REJECTED,
    STATUSES.WITHDRAWN,
  ],
  DOCUMENTS_REQUIRED: [STATUSES.UNDER_REVIEW, STATUSES.REJECTED, STATUSES.WITHDRAWN],
  RESUBMISSION_REQUIRED: [STATUSES.UNDER_REVIEW, STATUSES.REJECTED, STATUSES.WITHDRAWN],
  CORRECTION_REQUIRED: [STATUSES.UNDER_REVIEW, STATUSES.REJECTED, STATUSES.WITHDRAWN],
  APPROVED: [STATUSES.PAYMENT_PENDING, STATUSES.DISBURSED, STATUSES.COMPLETED],
  PAYMENT_PENDING: [STATUSES.DISBURSED, STATUSES.COMPLETED, STATUSES.REJECTED],
  DISBURSED: [STATUSES.COMPLETED],
  REJECTED: [],
  COMPLETED: [],
  WITHDRAWN: [],
};

// Progress percentage calculation
const STATUS_PROGRESS = {
  DRAFT: 10,
  SUBMITTED: 25,
  UNDER_REVIEW: 50,
  DOCUMENTS_REQUIRED: 40,
  RESUBMISSION_REQUIRED: 40,
  CORRECTION_REQUIRED: 40,
  APPROVED: 90,
  PAYMENT_PENDING: 95,
  DISBURSED: 100,
  COMPLETED: 100,
  REJECTED: 100,
  WITHDRAWN: 100,
};

const NEXT_STEPS = {
  DRAFT: 'Review your details and submit your application before the deadline.',
  SUBMITTED: 'Your application has been received and is queued for verification.',
  UNDER_REVIEW: 'Review committee is currently scrutinizing your documents and eligibility.',
  DOCUMENTS_REQUIRED: 'Please upload the additional documents requested by the reviewer.',
  RESUBMISSION_REQUIRED: 'Please update your application details as requested by the reviewer.',
  CORRECTION_REQUIRED: 'Corrections have been requested. Please update your details or documents.',
  APPROVED: 'Congratulations! Your scholarship grant has been approved and queued for disbursement.',
  PAYMENT_PENDING: 'Payment voucher generated; bank transfer in progress.',
  DISBURSED: 'Scholarship amount has been credited to your verified bank account.',
  COMPLETED: 'Scholarship disbursement cycle completed successfully.',
  REJECTED: 'Application review concluded. Criteria not satisfied.',
  WITHDRAWN: 'Application was withdrawn by the applicant.',
};

class StatusService {
  /**
   * Validate whether a status transition is permitted
   */
  static isValidTransition(currentStatus, targetStatus) {
    if (!currentStatus || !targetStatus) return false;
    if (currentStatus === targetStatus) return true;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  /**
   * Record a transition in the audit history
   */
  static async recordTransition(applicationId, previousStatus, newStatus, user, remarks, dbClient = null) {
    return await StatusRepository.addHistory(
      {
        application_id: applicationId,
        previous_status: previousStatus,
        new_status: newStatus,
        changed_by: user ? (user.id || user.email || 'SYSTEM') : 'SYSTEM',
        changed_by_role: user ? (user.role || 'SYSTEM') : 'SYSTEM',
        remarks: remarks || `Status changed from ${previousStatus} to ${newStatus}`,
      },
      dbClient
    );
  }

  /**
   * Get tracking summary with percentage and timeline
   */
  static async getTracking(application) {
    const history = await StatusRepository.getByApplicationId(application.application_id);
    const progress = STATUS_PROGRESS[application.status] || 25;
    const nextStep = NEXT_STEPS[application.status] || 'Processing';

    return {
      application_id: application.application_id,
      application_number: application.application_number,
      student_id: application.student_id,
      scholarship_id: application.scholarship_id,
      current_status: application.status,
      progress_percentage: progress,
      next_step: nextStep,
      submitted_at: application.submitted_at,
      updated_at: application.updated_at,
      timeline: history.map((h) => ({
        status: h.new_status || h.status,
        timestamp: h.changed_at,
        changed_by: h.changed_by,
        changed_by_role: h.changed_by_role,
        comment: h.remarks || h.comment,
      })),
    };
  }
}

module.exports = {
  STATUSES,
  ALLOWED_TRANSITIONS,
  StatusService,
};

