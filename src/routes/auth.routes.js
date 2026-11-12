

const express = require("express"); // auth routes mein APIs create hongi
const authController = require("../controllers/auth.controller");

const router = express.Router();

/* POST /api/v1/auth/register */
router.post("/register", authController.registerUser);

/* POST /api/v1/auth/login */
router.post("/login", authController.loginUser);

router.post("/logout", authController.logoutUser);

module.exports = router;
