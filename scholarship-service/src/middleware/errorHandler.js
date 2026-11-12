function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  if (res.headersSent) return next(error);

  if (error.code === "23505") {
    return res.status(409).json({ success: false, message: "A record with this value already exists" });
  }
  if (error.code === "23503") {
    return res.status(400).json({ success: false, message: "Related record does not exist" });
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : "Internal server error"
  });
}

module.exports = { notFound, errorHandler };
