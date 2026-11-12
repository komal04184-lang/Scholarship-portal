const express = require("express");
const controller = require("../controllers/scholarshipController");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Public read APIs
router.get("/", controller.list);
router.get("/:id", controller.getOne);

// Admin write APIs: token must be issued by the Auth service and contain role=admin
router.post("/admin", authenticateToken, requireAdmin, controller.create);
router.put("/admin/:id", authenticateToken, requireAdmin, controller.update);
router.patch("/admin/:id/status", authenticateToken, requireAdmin, controller.changeStatus);
router.delete("/admin/:id", authenticateToken, requireAdmin, controller.remove);

module.exports = router;
