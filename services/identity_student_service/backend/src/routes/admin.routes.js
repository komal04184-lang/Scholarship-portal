const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");
const asyncHandler = require("../middleware/asyncHandler");
const adminController = require("../controllers/admin.controller");

// Admin dashboard stats
router.get(
  "/dashboard",
  authMiddleware,
  allowRoles("admin", "reviewer"),
  asyncHandler(adminController.adminDashboard)
);

// Admin user management
router.get(
  "/users",
  authMiddleware,
  allowRoles("admin"),
  asyncHandler(adminController.listUsers)
);

router.get(
  "/users/:id",
  authMiddleware,
  allowRoles("admin"),
  asyncHandler(adminController.getUserById)
);

router.patch(
  "/users/:id/status",
  authMiddleware,
  allowRoles("admin"),
  asyncHandler(adminController.updateUserStatus)
);

router.patch(
  "/users/:id/role",
  authMiddleware,
  allowRoles("admin"),
  asyncHandler(adminController.updateUserRole)
);

module.exports = router;
