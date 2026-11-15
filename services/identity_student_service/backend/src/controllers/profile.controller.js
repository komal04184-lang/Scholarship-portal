const ProfileRepository = require("../repositories/profile.repository");
const UserRepository = require("../repositories/user.repository");
const AuditRepository = require("../repositories/audit.repository");

async function getMyProfile(req, res) {
  const profile = await ProfileRepository.findByUserId(req.user.id);

  if (!profile) {
    // If user exists in users table but no profile row yet, return fallback with basic user info
    const user = await UserRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Profile fetched successfully",
      user: {
        id: user.id,
        _id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        profile_complete: false,
        academic_details: {},
      },
    });
  }

  return res.status(200).json({
    status: "success",
    message: "Profile fetched successfully",
    user: {
      ...profile,
      _id: profile.user_id, // Backward compatibility with frontend
    },
  });
}

async function updateMyProfile(req, res) {
  const updatedProfile = await ProfileRepository.updateByUserId(req.user.id, req.body);

  await AuditRepository.logAction(
    req.user.id,
    "PROFILE_UPDATED",
    "Student updated their profile",
    req.ip
  );

  return res.status(200).json({
    status: "success",
    message: "Profile updated successfully",
    user: {
      ...updatedProfile,
      _id: updatedProfile.user_id,
    },
  });
}

async function getProfileById(req, res) {
  const targetId = req.params.id;

  // Authorization check: students can only access their own profile
  if (req.user.role === "student" && req.user.id !== targetId) {
    return res.status(403).json({
      status: "error",
      message: "Access denied. Students can only view their own profile.",
    });
  }

  const profile = await ProfileRepository.findById(targetId);

  if (!profile) {
    return res.status(404).json({
      status: "error",
      message: "Profile not found",
    });
  }

  return res.status(200).json({
    status: "success",
    profile: {
      ...profile,
      _id: profile.user_id,
    },
  });
}

async function updateProfileById(req, res) {
  const targetId = req.params.id;

  // Authorization check: only admin or the profile owner can update
  if (req.user.role !== "admin" && req.user.id !== targetId) {
    return res.status(403).json({
      status: "error",
      message: "Access denied. You cannot modify other students' profiles.",
    });
  }

  const updatedProfile = await ProfileRepository.updateByUserId(targetId, req.body);

  await AuditRepository.logAction(
    req.user.id,
    "PROFILE_UPDATED_BY_ADMIN",
    `Profile for user ${targetId} was updated`,
    req.ip
  );

  return res.status(200).json({
    status: "success",
    message: "Profile updated successfully",
    profile: updatedProfile,
  });
}

async function getBasicInfo(req, res) {
  const targetId = req.params.id;
  const basicInfo = await ProfileRepository.getBasicInfo(targetId);

  if (!basicInfo) {
    return res.status(404).json({
      status: "error",
      message: "Student identity not found",
    });
  }

  return res.status(200).json({
    status: "success",
    data: basicInfo,
  });
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  getProfileById,
  updateProfileById,
  getBasicInfo,
};
