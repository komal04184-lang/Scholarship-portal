import pg from "pg";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;
const memory = new Map();
let pool = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, "../../sql/schema.sql");

export async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL not set: using in-memory demo storage.");
    return;
  }
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined
  });
  await pool.query("SELECT 1");
  if (process.env.DB_AUTO_INIT === "true") {
    const schema = await fs.readFile(schemaPath, "utf8");
    await pool.query(schema);
  }
  console.log("PostgreSQL connected.");
}

export function isPostgres() {
  return Boolean(pool);
}

export async function query(text, params = []) {
  if (!pool) throw new Error("PostgreSQL is not configured");
  return pool.query(text, params);
}

export function memoryStore() {
  return memory;
}

export async function closeDatabase() {
  if (pool) await pool.end();
}
