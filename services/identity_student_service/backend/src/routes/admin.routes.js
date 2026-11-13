const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");

const asyncHandler = require("../middleware/asyncHandler");
const adminController = require("../controllers/admin.controller");

router.get(
    "/dashboard",
    authMiddleware,
    allowRoles("admin", "reviewer"),
    asyncHandler(adminController.adminDashboard)
);

module.exports = router;