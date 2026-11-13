const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const scholarshipRoutes = require("./routes/scholarshipRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*" }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 }));

app.get("/health", (req, res) => {
  res.json({ success: true, service: "scholarship-service", status: "running" });
});
app.use("/api/v1/scholarships", scholarshipRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
