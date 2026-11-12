import { Router } from "express";
import * as controller from "../controllers/reviewController.js";

const router = Router();
router.post("/", controller.createReview);
router.get("/", controller.listReviews);
router.get("/application/:applicationId", controller.getByApplication);
router.get("/:id", controller.getReview);
router.patch("/:id/documents", controller.verifyDocuments);
router.patch("/:id/eligibility", controller.updateEligibility);
router.patch("/:id/decision", controller.decide);

export default router;
