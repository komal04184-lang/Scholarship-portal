const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const profileRoutes = require("./routes/profile.routes");
const adminRoutes = require("./routes/admin.routes");
const errorHandler = require("./middleware/error.middleware");

// Express app initialize
const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/api/v1/health", (req, res) => {
    res.status(200).json({ status: "healthy", service: "identity" });
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/admin", adminRoutes);

// Global error handler (sabse last mein)
app.use(errorHandler);

module.exports = app;
