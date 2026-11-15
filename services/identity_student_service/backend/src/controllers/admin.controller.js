const UserRepository = require("../repositories/user.repository");
const ProfileRepository = require("../repositories/profile.repository");
const AuditRepository = require("../repositories/audit.repository");

async function adminDashboard(req, res) {
  const total_students = await UserRepository.countByRole("student");
  const total_reviewers = await UserRepository.countByRole("reviewer");
  const total_admins = await UserRepository.countByRole("admin");
  const total_users = await UserRepository.countTotal();

  return res.status(200).json({
    status: "success",
    message: "Admin dashboard statistics",
    stats: {
      total_students,
      total_reviewers,
      total_admins,
      total_users,
    },
  });
}

async function listUsers(req, res) {
  const { page = 1, limit = 20, role, status, search } = req.query;

  const result = await UserRepository.listUsers({
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    role,
    status,
    search,
  });

  return res.status(200).json({
    status: "success",
    data: result.users,
    pagination: result.pagination,
  });
}

async function getUserById(req, res) {
  const { id } = req.params;
  const user = await UserRepository.findById(id);

  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "User not found",
    });
  }

  const profile = await ProfileRepository.findByUserId(id);

  return res.status(200).json({
    status: "success",
    user: {
      ...user,
      profile: profile || null,
    },
  });
}

async function updateUserStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!["active", "inactive", "suspended"].includes(status)) {
    return res.status(400).json({
      status: "error",
      message: "Status must be one of: 'active', 'inactive', 'suspended'",
    });
  }

  const updated = await UserRepository.updateStatus(id, status);

  if (!updated) {
    return res.status(404).json({
      status: "error",
      message: "User not found",
    });
  }

  await AuditRepository.logAction(
    req.user.id,
    "USER_STATUS_UPDATED",
    `User ${id} status updated to ${status}`,
    req.ip
  );

  return res.status(200).json({
    status: "success",
    message: `User status updated to ${status}`,
    user: updated,
  });
}

async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body;

  if (!["student", "admin", "reviewer"].includes(role)) {
    return res.status(400).json({
      status: "error",
      message: "Role must be one of: 'student', 'admin', 'reviewer'",
    });
  }

  const updated = await UserRepository.updateRole(id, role);

  if (!updated) {
    return res.status(404).json({
      status: "error",
      message: "User not found",
    });
  }

  await AuditRepository.logAction(
    req.user.id,
    "USER_ROLE_UPDATED",
    `User ${id} role updated to ${role}`,
    req.ip
  );

  return res.status(200).json({
    status: "success",
    message: `User role updated to ${role}`,
    user: updated,
  });
}

module.exports = {
  adminDashboard,
  listUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
};
