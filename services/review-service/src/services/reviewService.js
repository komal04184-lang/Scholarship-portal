import * as model from '../models/reviewModel.js';
import { updateApplicationStatus } from '../clients/applicationClient.js';

const DOC_STATUSES = new Set(['PENDING', 'VERIFIED', 'REJECTED']);
const DECISIONS = new Set(['APPROVED', 'REJECTED', 'CORRECTION_REQUIRED']);

function httpError(message, status = 400) { const error = new Error(message); error.status = status; return error; }

export async function create(data) {
  if (!data.applicationId || !data.studentId || !data.scholarshipId) throw httpError('applicationId, studentId and scholarshipId are required');
  const documents = data.documents ?? [];
  if (!Array.isArray(documents) || documents.some(d => !d?.name)) throw httpError('documents must be an array and each document must have a name');
  return model.createReview({ ...data, documents: documents.map(d => ({
    documentId: d.documentId || d.id || null, name: d.name, status: d.status ?? 'PENDING', remarks: d.remarks ?? ''
  })) });
}

export async function verifyDocuments(id, documents, reviewerId) {
  if (!Array.isArray(documents) || documents.length === 0) throw httpError('Provide a non-empty documents array');
  if (documents.some(d => !d?.name || !DOC_STATUSES.has(d.status))) throw httpError('Each document needs a name and status: PENDING, VERIFIED, or REJECTED');
  const current = await model.getReview(id);
  if (!current) return null;
  if (current.decision) throw httpError('A finalized review cannot be changed', 409);
  const merged = [...current.documents];
  for (const incoming of documents) {
    const key = incoming.documentId || incoming.id;
    const index = key ? merged.findIndex(d => (d.documentId || d.id) === key) : merged.findIndex(d => d.name === incoming.name);
    const value = { ...(index >= 0 ? merged[index] : {}), documentId: key || incoming.documentId || null,
      name: incoming.name, status: incoming.status, remarks: incoming.remarks ?? '' };
    if (index >= 0) merged[index] = value; else merged.push(value);
  }
  const updated = await model.updateReview(id, { documents: merged, status: 'DOCUMENTS_UNDER_REVIEW' });
  await model.addHistory(id, reviewerId, current.status, updated.status, 'Document verification updated');
  return updated;
}

export async function updateEligibility(id, eligible, remarks = '', reviewerId) {
  if (typeof eligible !== 'boolean') throw httpError('eligible must be true or false');
  const current = await model.getReview(id);
  if (!current) return null;
  if (current.decision) throw httpError('A finalized review cannot be changed', 409);
  const status = eligible ? 'ELIGIBILITY_VERIFIED' : 'ELIGIBILITY_FAILED';
  const updated = await model.updateReview(id, { eligible, eligibilityRemarks: remarks, status });
  await model.addHistory(id, reviewerId, current.status, status, remarks || 'Eligibility review updated');
  return updated;
}

export async function decide(
  id,
  decision,
  remarks = '',
  reviewedBy = '',
  authorizationHeader
) {
  if (!DECISIONS.has(decision)) throw httpError('decision must be APPROVED, REJECTED, or CORRECTION_REQUIRED');
  const current = await model.getReview(id);
  if (!current) return null;
  if (current.decision) throw httpError('This review already has a final decision', 409);
  if (decision === 'APPROVED') {
    const allVerified = current.documents.length > 0 && current.documents.every(d => d.status === 'VERIFIED');
    if (!allVerified || current.eligible !== true) throw httpError('Cannot approve: all documents must be VERIFIED and eligibility must be true', 409);
  }
  const updated = await model.updateReview(id, { decision, decisionRemarks: remarks, reviewedBy, status: decision, callbackStatus: 'PENDING' });
  await model.addHistory(id, reviewedBy, current.status, decision, remarks || `Decision: ${decision}`);
  try {
    await updateApplicationStatus(
  current.applicationId,
  decision,
  remarks,
  authorizationHeader
);
    return await model.updateReview(id, { callbackStatus: 'SYNCED', callbackError: null });
  } catch (error) {
    await model.updateReview(id, { callbackStatus: 'PENDING', callbackError: error.message });
    updated.callbackStatus = 'PENDING';
    updated.callbackWarning = 'Decision saved, but Application Service status sync is pending.';
    return updated;
  }
}

export async function retryPendingCallbacks() {
  const pending = await model.listPendingCallbacks();
  for (const review of pending) {
    try {
      await updateApplicationStatus(review.applicationId, review.decision, review.decisionRemarks || '');
      await model.updateReview(review.id, { callbackStatus: 'SYNCED', callbackError: null });
    } catch (error) {
      await model.updateReview(review.id, { callbackStatus: 'PENDING', callbackError: error.message });
    }
  }
  return pending.length;
}
