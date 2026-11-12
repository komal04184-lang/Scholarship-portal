import { randomUUID } from "node:crypto";
import { isPostgres, query, memoryStore } from "../config/database.js";

const store = memoryStore();

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id,
    applicationId: row.application_id ?? row.applicationId,
    studentId: row.student_id ?? row.studentId,
    scholarshipId: row.scholarship_id ?? row.scholarshipId,
    status: row.status,
    documents: row.documents,
    eligible: row.eligible,
    eligibilityRemarks: row.eligibility_remarks ?? row.eligibilityRemarks,
    decision: row.decision,
    decisionRemarks: row.decision_remarks ?? row.decisionRemarks,
    reviewedBy: row.reviewed_by ?? row.reviewedBy,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt
  };
}

export async function createReview(data) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const review = {
    id, applicationId: data.applicationId, studentId: data.studentId,
    scholarshipId: data.scholarshipId, status: "PENDING",
    documents: data.documents ?? [], eligible: null, eligibilityRemarks: null,
    decision: null, decisionRemarks: null, reviewedBy: null,
    createdAt: now, updatedAt: now
  };
  if (!isPostgres()) {
    if ([...store.values()].some(r => r.applicationId === data.applicationId)) {
      const error = new Error("A review already exists for this application");
      error.status = 409; throw error;
    }
    store.set(id, review);
    return review;
  }
  const result = await query(
    `INSERT INTO reviews (id, application_id, student_id, scholarship_id, status, documents)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING *`,
    [id, data.applicationId, data.studentId, data.scholarshipId, "PENDING", JSON.stringify(review.documents)]
  );
  return normalize(result.rows[0]);
}

export async function listReviews(status) {
  if (!isPostgres()) return [...store.values()].filter(r => !status || r.status === status);
  const result = status
    ? await query("SELECT * FROM reviews WHERE status=$1 ORDER BY created_at DESC", [status])
    : await query("SELECT * FROM reviews ORDER BY created_at DESC");
  return result.rows.map(normalize);
}

export async function getReview(id) {
  if (!isPostgres()) return store.get(id) ?? null;
  const result = await query("SELECT * FROM reviews WHERE id=$1", [id]);
  return normalize(result.rows[0]);
}

export async function getReviewByApplication(applicationId) {
  if (!isPostgres()) return [...store.values()].find(r => r.applicationId === applicationId) ?? null;
  const result = await query("SELECT * FROM reviews WHERE application_id=$1", [applicationId]);
  return normalize(result.rows[0]);
}

export async function updateReview(id, changes) {
  const current = await getReview(id);
  if (!current) return null;
  const updated = { ...current, ...changes, updatedAt: new Date().toISOString() };
  if (!isPostgres()) {
    store.set(id, updated);
    return updated;
  }
  const result = await query(
    `UPDATE reviews SET status=$2, documents=$3::jsonb, eligible=$4,
     eligibility_remarks=$5, decision=$6, decision_remarks=$7, reviewed_by=$8,
     updated_at=NOW() WHERE id=$1 RETURNING *`,
    [id, updated.status, JSON.stringify(updated.documents), updated.eligible,
     updated.eligibilityRemarks, updated.decision, updated.decisionRemarks, updated.reviewedBy]
  );
  return normalize(result.rows[0]);
}
