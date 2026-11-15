function errorHandler(err, req, res, next) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors || {}).map((e) => e.message).join(", ");
    return res.status(400).json({ success: false, message: message || err.message });
  }

  // PostgreSQL unique violation ('23505') or MongoDB ('11000')
  if (err.code === '23505' || err.code === 11000) {
    const detail = err.detail || 'Record with this information already exists';
    const msg = (detail && detail.includes('email'))
      ? 'User already exists with this email'
      : 'A record with this information already exists';
    return res.status(409).json({ success: false, message: msg, detail });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid value for " + err.path });
  }

  console.error('[identity-service error]', err);
  return res.status(500).json({ success: false, message: err.message || "Internal server error" });
}

module.exports = errorHandler;
