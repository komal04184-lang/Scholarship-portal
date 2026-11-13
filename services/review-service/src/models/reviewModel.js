import { randomUUID } from 'node:crypto';
import { isPostgres, query, memoryStore } from '../config/database.js';
const store = memoryStore();
const history = [];

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id, applicationId: row.application_id ?? row.applicationId,
    studentId: row.student_id ?? row.studentId, scholarshipId: row.scholarship_id ?? row.scholarshipId,
    status: row.status, documents: row.documents || [], eligible: row.eligible,
    eligibilityRemarks: row.eligibility_remarks ?? row.eligibilityRemarks,
    decision: row.decision, decisionRemarks: row.decision_remarks ?? row.decisionRemarks,
    reviewedBy: row.reviewed_by ?? row.reviewedBy, callbackStatus: row.callback_status ?? row.callbackStatus ?? null,
    callbackError: row.callback_error ?? row.callbackError ?? null,
    createdAt: row.created_at ?? row.createdAt, updatedAt: row.updated_at ?? row.updatedAt
  };
}

export async function createReview(data) {
  const id = randomUUID(); const now = new Date().toISOString();
  const review = { id, applicationId: data.applicationId, studentId: data.studentId, scholarshipId: data.scholarshipId,
    status: 'PENDING', documents: data.documents ?? [], eligible: null, eligibilityRemarks: null,
    decision: null, decisionRemarks: null, reviewedBy: null, callbackStatus: null, callbackError: null, createdAt: now, updatedAt: now };
  if (!isPostgres()) {
    if ([...store.values()].some(r => r.applicationId === data.applicationId)) { const e = new Error('A review already exists for this application'); e.status = 409; throw e; }
    store.set(id, review); return review;
  }
  const result = await query(`INSERT INTO reviews (id, application_id, student_id, scholarship_id, status, documents)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING *`,
    [id, data.applicationId, data.studentId, data.scholarshipId, 'PENDING', JSON.stringify(review.documents)]);
  return normalize(result.rows[0]);
}

export async function listReviews(status) {
  if (!isPostgres()) return [...store.values()].filter(r => !status || r.status === status);
  const result = status ? await query('SELECT * FROM reviews WHERE status=$1 ORDER BY created_at DESC', [status]) : await query('SELECT * FROM reviews ORDER BY created_at DESC');
  return result.rows.map(normalize);
}
export async function getReview(id) {
  if (!isPostgres()) return store.get(id) ?? null;
  const result = await query('SELECT * FROM reviews WHERE id=$1', [id]); return normalize(result.rows[0]);
}
export async function getReviewByApplication(applicationId) {
  if (!isPostgres()) return [...store.values()].find(r => r.applicationId === applicationId) ?? null;
  const result = await query('SELECT * FROM reviews WHERE application_id=$1', [applicationId]); return normalize(result.rows[0]);
}
export async function updateReview(id, changes) {
  const current = await getReview(id); if (!current) return null;
  const updated = { ...current, ...changes, updatedAt: new Date().toISOString() };
  if (!isPostgres()) { store.set(id, updated); return updated; }
  const result = await query(`UPDATE reviews SET status=$2, documents=$3::jsonb, eligible=$4,
    eligibility_remarks=$5, decision=$6, decision_remarks=$7, reviewed_by=$8,
    callback_status=$9, callback_error=$10, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [id, updated.status, JSON.stringify(updated.documents), updated.eligible, updated.eligibilityRemarks,
      updated.decision, updated.decisionRemarks, updated.reviewedBy, updated.callbackStatus, updated.callbackError]);
  return normalize(result.rows[0]);
}
export async function addHistory(reviewId, reviewerId, previousStatus, newStatus, remarks = '') {
  const entry = { id: randomUUID(), reviewId, reviewerId: reviewerId || null, previousStatus, newStatus, remarks, createdAt: new Date().toISOString() };
  if (!isPostgres()) { history.push(entry); return entry; }
  await query(`INSERT INTO review_history (id, review_id, reviewer_id, previous_status, new_status, remarks)
    VALUES ($1,$2,$3,$4,$5,$6)`, [entry.id, reviewId, entry.reviewerId, previousStatus, newStatus, remarks]);
  return entry;
}
export async function listPendingCallbacks() {
  if (!isPostgres()) return [...store.values()].filter(r => r.callbackStatus === 'PENDING' && r.decision);
  const result = await query("SELECT * FROM reviews WHERE callback_status='PENDING' AND decision IS NOT NULL ORDER BY updated_at ASC");
  return result.rows.map(normalize);
}
export async function getReviewHistory(id) {
  if (!isPostgres()) return history.filter(h => h.reviewId === id);
  const result = await query('SELECT * FROM review_history WHERE review_id=$1 ORDER BY created_at ASC', [id]); return result.rows;
}
