const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  let token = null;

  // 1. Check HTTP-only cookie
  let isCookieAuth = false;
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    isCookieAuth = true;
  }

  // 2. Check Authorization header (Bearer token)
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      token = parts[1];
      isCookieAuth = false;
    }
  }

  // CSRF Protection (SEC-05): For state-changing mutations using cookie authentication, enforce Origin/Referer
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase());
  if (isCookieAuth && isMutation && !req.headers.authorization) {
    const origin = req.headers.origin || req.headers.referer;
    if (origin) {
      try {
        const originUrl = new URL(origin);
        const allowedHosts = ["localhost", "127.0.0.1", "apexscholar.local"];
        if (!allowedHosts.includes(originUrl.hostname)) {
          return res.status(403).json({
            status: "error",
            message: "Cross-site request blocked: untrusted origin/referer.",
            code: "CSRF_ORIGIN_BLOCKED",
          });
        }
      } catch (_) {
        return res.status(403).json({
          status: "error",
          message: "Cross-site request blocked: malformed origin header.",
          code: "CSRF_MALFORMED_ORIGIN",
        });
      }
    }
  }

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Please login first. No authentication token provided.",
    });
  }

  try {
    const secret = process.env.JWT_SECRET || "dev_jwt_secret_change_in_production_k9x2m4p7";
    const decoded = jwt.verify(token, secret);

    const role = (decoded.role || (decoded.roles && decoded.roles[0]) || "student").toLowerCase();

    req.user = {
      id: String(decoded.id || decoded.userId || decoded.student_id || decoded._id || ""),
      username: decoded.username || null,
      email: decoded.email || null,
      role: role,
      decoded,
    };

    if (!req.user.id) {
      return res.status(401).json({
        status: "error",
        message: "Invalid token: missing user identifier.",
      });
    }

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "error",
        message: "Authentication token has expired. Please log in again.",
        code: "TOKEN_EXPIRED",
      });
    }
    return res.status(401).json({
      status: "error",
      message: "Invalid or malformed authentication token.",
      code: "INVALID_TOKEN",
    });
  }
}

module.exports = authMiddleware;
