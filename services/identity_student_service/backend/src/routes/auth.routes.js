const express = require("express");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const asyncHandler = require("../middleware/asyncHandler");
const createLocalRateLimiter = require("../middleware/localRateLimiter");

const router = express.Router();

// Direct service rate limiters for sensitive endpoints (SEC-04)
const authActionLimiter = createLocalRateLimiter(60000, 30, 'Too many authentication attempts on Identity Service. Please wait.');
const refreshLimiter = createLocalRateLimiter(60000, 60, 'Too many session refresh attempts. Please wait.');

// Public routes
router.post("/register", authActionLimiter, asyncHandler(authController.registerUser));
router.post("/login", authActionLimiter, asyncHandler(authController.loginUser));
router.post("/logout", asyncHandler(authController.logoutUser));
router.post("/refresh", refreshLimiter, asyncHandler(authController.refreshToken));
router.post("/forgot-password", authActionLimiter, asyncHandler(authController.forgotPassword));
router.post("/reset-password", authActionLimiter, asyncHandler(authController.resetPassword));
router.post("/verify-email", asyncHandler(authController.verifyEmail));

// Protected route
router.get("/me", authMiddleware, asyncHandler(authController.getMe));

module.exports = router;
