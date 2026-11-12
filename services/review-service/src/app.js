import express from "express";
import cors from "cors";
import helmet from "helmet";
import reviewRoutes from "./routes/reviewRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => res.json({
  service: "Scholarship Review Service",
  status: "running",
  docs: "See README.md for API examples"
}));
app.get("/api/health", (req, res) => res.json({
  success: true,
  service: "review-service",
  status: "healthy"
}));
app.use("/api/reviews", reviewRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use(errorHandler);

export default app;
