import { Router } from 'express';
import * as controller from '../controllers/reviewController.js';
import { requireReviewer, requireServiceToken, requireServiceOrReviewer } from '../middleware/auth.js';

const router = Router();
// Reviews may be created by internal microservices OR authorized reviewers/admins
router.post('/', requireServiceOrReviewer, controller.createReview);
router.use(requireReviewer);
router.get('/', controller.listReviews);
router.get('/application/:applicationId', controller.getByApplication);
router.get('/:id/history', controller.getHistory);
router.get('/:id', controller.getReview);
router.patch('/:id/documents', controller.verifyDocuments);
router.patch('/:id/eligibility', controller.updateEligibility);
router.patch('/:id/decision', controller.decide);
export default router;
