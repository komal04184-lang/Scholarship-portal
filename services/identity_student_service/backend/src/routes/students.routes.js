const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const asyncHandler = require("../middleware/asyncHandler");
const profileController = require("../controllers/profile.controller");

// /api/v1/students endpoints
router.get("/me", authMiddleware, asyncHandler(profileController.getMyProfile));
router.put("/me", authMiddleware, asyncHandler(profileController.updateMyProfile));
router.post("/profile", authMiddleware, asyncHandler(profileController.updateMyProfile));
router.get("/:id", authMiddleware, asyncHandler(profileController.getProfileById));
router.put("/:id", authMiddleware, asyncHandler(profileController.updateProfileById));
router.get("/:id/basic-info", asyncHandler(profileController.getBasicInfo));

module.exports = router;

