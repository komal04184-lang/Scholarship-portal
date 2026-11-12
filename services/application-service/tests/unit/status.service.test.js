const { StatusService, STATUSES } = require('../../src/services/status.service');

describe('Status Service & State Machine (Unit)', () => {
  it('should allow valid transitions according to lifecycle', () => {
    expect(StatusService.isValidTransition(STATUSES.SUBMITTED, STATUSES.UNDER_REVIEW)).toBe(true);
    expect(StatusService.isValidTransition(STATUSES.UNDER_REVIEW, STATUSES.APPROVED)).toBe(true);
    expect(StatusService.isValidTransition(STATUSES.UNDER_REVIEW, STATUSES.REJECTED)).toBe(true);
    expect(StatusService.isValidTransition(STATUSES.UNDER_REVIEW, STATUSES.DOCUMENTS_REQUIRED)).toBe(true);
    expect(StatusService.isValidTransition(STATUSES.APPROVED, STATUSES.DISBURSED)).toBe(true);
  });

  it('should reject invalid lifecycle transitions', () => {
    // Cannot disburse immediately from submitted
    expect(StatusService.isValidTransition(STATUSES.SUBMITTED, STATUSES.DISBURSED)).toBe(false);
    // Cannot transition out of rejected
    expect(StatusService.isValidTransition(STATUSES.REJECTED, STATUSES.APPROVED)).toBe(false);
    // Cannot transition out of completed
    expect(StatusService.isValidTransition(STATUSES.COMPLETED, STATUSES.UNDER_REVIEW)).toBe(false);
  });
});

