import test from "node:test";
import assert from "node:assert/strict";
import { create, verifyDocuments, updateEligibility, decide } from "../src/services/reviewService.js";
import { getReview } from "../src/models/reviewModel.js";

test("review workflow prevents approval before verification", async () => {
  const review = await create({
    applicationId: "TEST-APP-001",
    studentId: "TEST-STU-001",
    scholarshipId: "TEST-SCH-001",
    documents: [{ name: "Marks Card" }]
  });
  await assert.rejects(
    () => decide(review.id, "APPROVED"),
    /Cannot approve/
  );
  await verifyDocuments(review.id, [{ name: "Marks Card", status: "VERIFIED" }]);
  await updateEligibility(review.id, true, "Criteria met");
  const approved = await decide(review.id, "APPROVED", "All checks passed", "REVIEWER-1");
  assert.equal(approved.status, "APPROVED");
  assert.equal((await getReview(review.id)).decision, "APPROVED");
});
