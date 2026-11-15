function allowRoles(...roles) {
  const allowed = roles.map((r) => String(r).toLowerCase());

  return function (req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required before role check.",
      });
    }

    const userRole = String(req.user.role).toLowerCase();

    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        status: "error",
        message: `Access denied. Requires one of roles: [${roles.join(", ")}]`,
      });
    }

    next();
  };
}

module.exports = allowRoles;
