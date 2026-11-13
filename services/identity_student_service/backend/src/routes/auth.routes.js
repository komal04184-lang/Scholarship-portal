

const express = require("express"); // auth routes mein APIs create hongi
const authController = require("../controllers/auth.controller");

const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

/* POST /api/v1/auth/register */
router.post("/register", asyncHandler(authController.registerUser));

/* POST /api/v1/auth/login */
router.post("/login", asyncHandler(authController.loginUser));

router.post("/logout", asyncHandler(authController.logoutUser));

module.exports = router;
