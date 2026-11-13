const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const asyncHandler = require("../middleware/asyncHandler");
const profileController = require("../controllers/profile.controller");

router.get("/me", authMiddleware, asyncHandler(profileController.getMyProfile));//student aapni profile fetch kr skta hai 
router.put("/me", authMiddleware, asyncHandler(profileController.updateMyProfile));//student profile update kr skta hai

module.exports = router;