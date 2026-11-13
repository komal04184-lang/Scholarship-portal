const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const profileController = require("../controllers/profile.controller");

router.get("/me", authMiddleware, profileController.getMyProfile);//student aapni profile fetch kr skta hai 
router.put("/me", authMiddleware, profileController.updateMyProfile);//student profile update kr skta hai

module.exports = router;