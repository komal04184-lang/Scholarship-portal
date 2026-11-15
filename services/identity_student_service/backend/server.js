const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app = require("./src/app");
const { connectDB } = require("./src/db/db");

const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET not provided, using fallback development secret.");
}

async function start() {
  const isConnected = await connectDB();
  if (!isConnected) {
    console.warn("⚠️ Identity Service starting in resilient mode (PostgreSQL identity_db will reconnect automatically when available).");
  }

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` IDENTITY STUDENT SERVICE RUNNING ON PORT ${PORT}`);
    console.log(` Database: PostgreSQL (${process.env.DB_NAME || "identity_db"})`);
    console.log(` Health:   http://localhost:${PORT}/api/v1/health`);
    console.log(`====================================================`);
  });
}

start();
