const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getClient } = require("../db/db");
const UserRepository = require("../repositories/user.repository");
const ProfileRepository = require("../repositories/profile.repository");
const SessionRepository = require("../repositories/session.repository");
const TokenRepository = require("../repositories/token.repository");
const AuditRepository = require("../repositories/audit.repository");

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_in_production_k9x2m4p7";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// 1. Register User
async function registerUser(req, res) {
  const {
    username,
    email,
    password,
    phone,
    date_of_birth,
    gender,
    address,
    category,
    family_income,
    family_size,
    state,
    city,
    academic_details,
    enrollment_no,
  } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      status: "error",
      message: "Please provide username, email, and password.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();

  // Check duplicate email
  const existingEmail = await UserRepository.findByEmail(normalizedEmail);
  if (existingEmail) {
    return res.status(409).json({
      status: "error",
      message: "User already exists with this email address.",
    });
  }

  // Check duplicate username
  const existingUsername = await UserRepository.findByUsername(normalizedUsername);
  if (existingUsername) {
    return res.status(409).json({
      status: "error",
      message: "User already exists with this username.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // PostgreSQL transaction: create user + create student_profiles
  const client = await getClient();
  let createdUser = null;
  let createdProfile = null;

  try {
    await client.query("BEGIN");

    createdUser = await UserRepository.createUser(
      {
        username: normalizedUsername,
        email: normalizedEmail,
        password_hash: passwordHash,
        role: "student",
      },
      client
    );

    createdProfile = await ProfileRepository.createProfile(
      {
        user_id: createdUser.id,
        enrollment_no: enrollment_no || null,
        phone: phone || null,
        dob: date_of_birth || null,
        gender: gender || null,
        address: address || null,
        city: city || null,
        state: state || null,
        category: category || null,
        family_income: family_income !== undefined ? family_income : 0,
        family_size: family_size !== undefined ? family_size : 1,
        academic_details: academic_details || {},
      },
      client
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const token = generateAccessToken(createdUser);
  res.cookie("token", token, cookieOptions);

  await AuditRepository.logAction(
    createdUser.id,
    "USER_REGISTERED",
    `Student registered with email ${normalizedEmail}`,
    req.ip
  );

  return res.status(201).json({
    status: "success",
    message: "User registered successfully",
    token,
    user: {
      id: createdUser.id,
      username: createdUser.username,
      email: createdUser.email,
      role: createdUser.role,
      status: createdUser.status,
      profile_complete: createdProfile.profile_complete,
    },
  });
}

// 2. Login User
async function loginUser(req, res) {
  const { username, email, password } = req.body;

  if ((!username && !email) || !password) {
    return res.status(400).json({
      status: "error",
      message: "Please provide username/email and password",
    });
  }

  const identifier = (email || username).trim();
  let user = null;

  if (identifier.includes("@")) {
    user = await UserRepository.findByEmail(identifier);
  } else {
    user = await UserRepository.findByUsername(identifier);
  }

  if (!user) {
    return res.status(401).json({
      status: "error",
      message: "Invalid credentials",
    });
  }

  if (user.status !== "active") {
    return res.status(403).json({
      status: "error",
      message: `Account is ${user.status}. Please contact administration.`,
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    await AuditRepository.logAction(user.id, "LOGIN_FAILED", "Invalid password attempt", req.ip);
    return res.status(401).json({
      status: "error",
      message: "Invalid credentials",
    });
  }

  const token = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await SessionRepository.createSession(user.id, refreshTokenHash, refreshExpiresAt);

  res.cookie("token", token, cookieOptions);
  res.cookie("refreshToken", rawRefreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  await AuditRepository.logAction(user.id, "LOGIN_SUCCESS", "Logged in successfully", req.ip);

  return res.status(200).json({
    status: "success",
    message: "User logged in successfully",
    token,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
}

// 3. Logout User
async function logoutUser(req, res) {
  const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (rawRefreshToken) {
    const refreshTokenHash = hashToken(rawRefreshToken);
    await SessionRepository.revokeSession(refreshTokenHash);
  }

  res.clearCookie("token", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  if (req.user && req.user.id) {
    await AuditRepository.logAction(req.user.id, "LOGOUT", "User logged out", req.ip);
  }

  return res.status(200).json({
    status: "success",
    message: "User logged out successfully",
  });
}

// 4. Refresh Token
async function refreshToken(req, res) {
  const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!rawRefreshToken) {
    return res.status(401).json({
      status: "error",
      message: "Refresh token required",
    });
  }

  const refreshTokenHash = hashToken(rawRefreshToken);
  const session = await SessionRepository.findActiveSession(refreshTokenHash);

  if (!session) {
    // SEC-06 Reuse Detection: Check if this was a valid, already-revoked session
    const existingSession = await SessionRepository.findAnySession(refreshTokenHash);
    if (existingSession && existingSession.revoked) {
      // Possible token theft / replay attack: Revoke all active sessions for this user
      await SessionRepository.revokeAllUserSessions(existingSession.user_id);
      await AuditRepository.logAction(
        existingSession.user_id,
        "SECURITY_ALERT_REFRESH_TOKEN_REUSE",
        "Previously revoked refresh token was re-submitted. Revoked all active user sessions.",
        req.ip
      );
      res.clearCookie("token", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);
      return res.status(401).json({
        status: "error",
        message: "Compromised or revoked refresh session detected. All sessions terminated for security. Please login again.",
        code: "REVOKED_SESSION_REUSE_DETECTED",
      });
    }

    return res.status(401).json({
      status: "error",
      message: "Invalid or expired refresh session. Please login again.",
    });
  }

  const user = await UserRepository.findById(session.user_id);
  if (!user || user.status !== "active") {
    return res.status(401).json({
      status: "error",
      message: "Account not active or user not found.",
    });
  }

  // Rotate refresh token
  await SessionRepository.revokeSession(refreshTokenHash);
  const newRawRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRawRefreshToken);
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await SessionRepository.createSession(user.id, newRefreshTokenHash, refreshExpiresAt);

  const newAccessToken = generateAccessToken(user);
  res.cookie("token", newAccessToken, cookieOptions);
  res.cookie("refreshToken", newRawRefreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    status: "success",
    token: newAccessToken,
    refreshToken: newRawRefreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
}

// 5. Forgot Password
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ status: "error", message: "Email is required" });
  }

  const user = await UserRepository.findByEmail(email.trim().toLowerCase());
  if (!user) {
    // For security, return generic success even if email not registered
    return res.status(200).json({
      status: "success",
      message: "If an account with that email exists, a password reset link has been dispatched.",
    });
  }

  const rawResetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawResetToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await TokenRepository.createPasswordResetToken(user.id, tokenHash, expiresAt);
  await AuditRepository.logAction(user.id, "PASSWORD_RESET_REQUESTED", "Password reset initiated", req.ip);

  // In development, return the token for quick verification
  return res.status(200).json({
    status: "success",
    message: "If an account with that email exists, a password reset link has been dispatched.",
    ...(process.env.NODE_ENV !== "production" ? { dev_token: rawResetToken } : {}),
  });
}

// 6. Reset Password
async function resetPassword(req, res) {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({
      status: "error",
      message: "Reset token and new password are required.",
    });
  }

  const tokenHash = hashToken(token);
  const record = await TokenRepository.findValidPasswordResetToken(tokenHash);

  if (!record) {
    return res.status(400).json({
      status: "error",
      message: "Invalid or expired password reset token.",
    });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await UserRepository.updatePassword(record.user_id, passwordHash);
  await TokenRepository.markPasswordResetTokenUsed(tokenHash);
  await SessionRepository.revokeAllUserSessions(record.user_id);
  await AuditRepository.logAction(record.user_id, "PASSWORD_RESET_COMPLETED", "Password was reset", req.ip);

  return res.status(200).json({
    status: "success",
    message: "Password reset successfully. You can now login with your new password.",
  });
}

// 7. Verify Email
async function verifyEmail(req, res) {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ status: "error", message: "Verification token is required" });
  }

  const tokenHash = hashToken(token);
  const record = await TokenRepository.findValidEmailVerificationToken(tokenHash);

  if (!record) {
    return res.status(400).json({
      status: "error",
      message: "Invalid or expired email verification token.",
    });
  }

  await UserRepository.markEmailVerified(record.user_id);
  await TokenRepository.markEmailTokenVerified(tokenHash);
  await AuditRepository.logAction(record.user_id, "EMAIL_VERIFIED", "Email successfully verified", req.ip);

  return res.status(200).json({
    status: "success",
    message: "Email verified successfully.",
  });
}

// 8. Get current authenticated user
async function getMe(req, res) {
  const user = await UserRepository.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ status: "error", message: "User not found" });
  }

  const profile = await ProfileRepository.findByUserId(req.user.id);

  return res.status(200).json({
    status: "success",
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      email_verified: user.email_verified,
      profile: profile || null,
      academic_details: profile?.academic_details || {},
    },
  });
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getMe,
};
