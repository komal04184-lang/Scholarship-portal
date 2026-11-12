import * as model from "../models/reviewModel.js";
import * as service from "../services/reviewService.js";

export async function createReview(req, res, next) {
  try {
    const review = await service.create(req.body);
    res.status(201).json({ success: true, message: "Review created", data: review });
  } catch (error) { next(error); }
}
export async function listReviews(req, res, next) {
  try {
    const data = await model.listReviews(req.query.status);
    res.json({ success: true, count: data.length, data });
  } catch (error) { next(error); }
}
export async function getReview(req, res, next) {
  try {
    const data = await model.getReview(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Review not found" });
    res.json({ success: true, data });
  } catch (error) { next(error); }
}
export async function getByApplication(req, res, next) {
  try {
    const data = await model.getReviewByApplication(req.params.applicationId);
    if (!data) return res.status(404).json({ success: false, message: "Review not found for this application" });
    res.json({ success: true, data });
  } catch (error) { next(error); }
}
export async function verifyDocuments(req, res, next) {
  try {
    const data = await service.verifyDocuments(req.params.id, req.body.documents);
    if (!data) return res.status(404).json({ success: false, message: "Review not found" });
    res.json({ success: true, message: "Document verification updated", data });
  } catch (error) { next(error); }
}
export async function updateEligibility(req, res, next) {
  try {
    const data = await service.updateEligibility(req.params.id, req.body.eligible, req.body.remarks);
    if (!data) return res.status(404).json({ success: false, message: "Review not found" });
    res.json({ success: true, message: "Eligibility review updated", data });
  } catch (error) { next(error); }
}
export async function decide(req, res, next) {
  try {
    const data = await service.decide(req.params.id, req.body.decision, req.body.remarks, req.body.reviewedBy);
    if (!data) return res.status(404).json({ success: false, message: "Review not found" });
    res.json({ success: true, message: "Review decision saved", data });
  } catch (error) { next(error); }
}
