require("dotenv").config();
const app = require("./app");
const db = require("./config/db");

const PORT = process.env.PORT || 5002;

async function start() {
  try {
    await db.query("SELECT 1");
    app.listen(PORT, () => console.log(`Scholarship Service running at http://localhost:${PORT}`));
  } catch (error) {
    console.error("Could not connect to PostgreSQL. Check DATABASE_URL and database status.", error.message);
    process.exit(1);
  }
}

start();
