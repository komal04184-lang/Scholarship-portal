const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const { pool } = require("./db/db");
const authRoutes = require("./routes/auth.routes");
const profileRoutes = require("./routes/profile.routes");
const studentsRoutes = require("./routes/students.routes");
const adminRoutes = require("./routes/admin.routes");
const errorHandler = require("./middleware/error.middleware");

// Production Security Startup Check (SEC-07)
if (process.env.NODE_ENV === "production") {
  const weakSecrets = [
    "dev_jwt_secret_change_in_production_k9x2m4p7",
    "internal_super_secret_token_change_in_prod",
    "secret",
  ];
  if (!process.env.JWT_SECRET || weakSecrets.includes(process.env.JWT_SECRET)) {
    console.error("FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or using an insecure development fallback in production mode.");
    process.exit(1);
  }
}

// Express app initialize
const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Correlation ID middleware
app.use((req, res, next) => {
  const correlationId = req.headers["x-correlation-id"] || `id-${Date.now()}`;
  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);
  next();
});

// Swagger UI documentation
try {
  const swaggerUi = require("swagger-ui-express");
  const yaml = require("js-yaml");
  const swaggerPath = path.join(__dirname, "../docs/openapi.yaml");
  if (fs.existsSync(swaggerPath)) {
    const swaggerDoc = yaml.load(fs.readFileSync(swaggerPath, "utf8"));
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    console.log("[identity-service] Swagger UI: /api-docs");
  }
} catch (e) {
  console.warn("[identity-service] Swagger UI not available:", e.message);
}

// Health check endpoints
async function healthHandler(req, res) {
  let dbStatus = "connected";
  let dbName = process.env.DB_NAME || "identity_db";

  try {
    await pool.query("SELECT 1");
  } catch (err) {
    dbStatus = `disconnected (${err.message})`;
  }

  const isHealthy = !dbStatus.startsWith("disconnected");
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "degraded",
    service: "identity-student-service",
    database: {
      type: "postgresql",
      name: dbName,
      status: dbStatus,
    },
    timestamp: new Date().toISOString(),
  });
}

app.get("/health", healthHandler);
app.get("/api/v1/health", healthHandler);

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/students", studentsRoutes);
app.use("/api/v1/admin", adminRoutes);

// Global error handler
app.use(errorHandler);

module.exports = app;
