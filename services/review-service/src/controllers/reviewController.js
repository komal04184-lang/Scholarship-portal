import * as model from '../models/reviewModel.js';
import * as service from '../services/reviewService.js';
export async function createReview(req, res, next) { try { const review = await service.create(req.body); res.status(201).json({ success: true, message: 'Review created', data: review }); } catch (e) { next(e); } }
export async function listReviews(req, res, next) { try { const data = await model.listReviews(req.query.status); res.json({ success: true, count: data.length, data }); } catch (e) { next(e); } }
export async function getReview(req, res, next) { try { const data = await model.getReview(req.params.id); if (!data) return res.status(404).json({ success: false, message: 'Review not found' }); res.json({ success: true, data }); } catch (e) { next(e); } }
export async function getByApplication(req, res, next) { try { const data = await model.getReviewByApplication(req.params.applicationId); if (!data) return res.status(404).json({ success: false, message: 'Review not found for this application' }); res.json({ success: true, data }); } catch (e) { next(e); } }
export async function getHistory(req, res, next) { try { const review = await model.getReview(req.params.id); if (!review) return res.status(404).json({ success: false, message: 'Review not found' }); const data = await model.getReviewHistory(req.params.id); res.json({ success: true, count: data.length, data }); } catch (e) { next(e); } }
export async function verifyDocuments(req, res, next) { try { const data = await service.verifyDocuments(req.params.id, req.body.documents, req.user.id); if (!data) return res.status(404).json({ success: false, message: 'Review not found' }); res.json({ success: true, message: 'Document verification updated', data }); } catch (e) { next(e); } }
export async function updateEligibility(req, res, next) { try { const data = await service.updateEligibility(req.params.id, req.body.eligible, req.body.remarks, req.user.id); if (!data) return res.status(404).json({ success: false, message: 'Review not found' }); res.json({ success: true, message: 'Eligibility review updated', data }); } catch (e) { next(e); } }
export async function decide(req, res, next) { try { const data = await service.decide(
  req.params.id,
  req.body.decision,
  req.body.remarks,
  req.user.id,
  req.get('authorization')
); if (!data) return res.status(404).json({ success: false, message: 'Review not found' }); const pending = data.callbackStatus === 'PENDING'; res.status(pending ? 202 : 200).json({ success: true, message: pending ? 'Decision saved; Application Service sync is pending' : 'Review decision saved and application updated', data }); } catch (e) { next(e); } }
