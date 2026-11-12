import * as model from "../models/reviewModel.js";

const DOC_STATUSES = new Set(["PENDING", "VERIFIED", "REJECTED"]);

export async function create(data) {
  if (!data.applicationId || !data.studentId || !data.scholarshipId) {
    const error = new Error("applicationId, studentId and scholarshipId are required");
    error.status = 400; throw error;
  }
  const documents = data.documents ?? [];
  if (!Array.isArray(documents) || documents.some(d => !d.name)) {
    const error = new Error("documents must be an array and each document must have a name");
    error.status = 400; throw error;
  }
  return model.createReview({
    ...data,
    documents: documents.map(d => ({ name: d.name, status: d.status ?? "PENDING", remarks: d.remarks ?? "" }))
  });
}

export async function verifyDocuments(id, documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    const error = new Error("Provide a non-empty documents array");
    error.status = 400; throw error;
  }
  if (documents.some(d => !d.name || !DOC_STATUSES.has(d.status))) {
    const error = new Error("Each document needs a name and status: PENDING, VERIFIED, or REJECTED");
    error.status = 400; throw error;
  }
  const current = await model.getReview(id);
  if (!current) return null;
  const updated = await model.updateReview(id, {
    documents: documents.map(d => ({ name: d.name, status: d.status, remarks: d.remarks ?? "" })),
    status: "DOCUMENTS_UNDER_REVIEW"
  });
  return updated;
}

export async function updateEligibility(id, eligible, remarks = "") {
  if (typeof eligible !== "boolean") {
    const error = new Error("eligible must be true or false");
    error.status = 400; throw error;
  }
  const current = await model.getReview(id);
  if (!current) return null;
  return model.updateReview(id, {
    eligible, eligibilityRemarks: remarks,
    status: eligible ? "ELIGIBILITY_VERIFIED" : "ELIGIBILITY_FAILED"
  });
}

export async function decide(id, decision, remarks = "", reviewedBy = "") {
  const allowed = ["APPROVED", "REJECTED", "CORRECTION_REQUIRED"];
  if (!allowed.includes(decision)) {
    const error = new Error("decision must be APPROVED, REJECTED, or CORRECTION_REQUIRED");
    error.status = 400; throw error;
  }
  const current = await model.getReview(id);
  if (!current) return null;
  if (decision === "APPROVED") {
    const allVerified = current.documents.length > 0 &&
      current.documents.every(d => d.status === "VERIFIED");
    if (!allVerified || current.eligible !== true) {
      const error = new Error("Cannot approve: all documents must be VERIFIED and eligibility must be true");
      error.status = 409; throw error;
    }
  }
  return model.updateReview(id, {
    decision, decisionRemarks: remarks, reviewedBy,
    status: decision
  });
}
