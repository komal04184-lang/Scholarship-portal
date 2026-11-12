const db = require("../config/db");

const fields = [
  "name", "description", "category", "amount", "min_cgpa", "max_income",
  "department", "deadline", "total_slots", "status"
];

function normalize(row) {
  return {
    ...row,
    eligibility_criteria: row.eligibility_criteria || [],
    required_documents: row.required_documents || []
  };
}

async function list(filters) {
  const where = [];
  const values = [];
  const add = (sql, value) => { values.push(value); where.push(sql.replace("?", `$${values.length}`)); };

  if (filters.category) add("s.category = ?", filters.category);
  if (filters.department) add("LOWER(s.department) = LOWER(?)", filters.department);
  if (filters.status) add("s.status = ?", filters.status);
  if (filters.minCgpa !== undefined) add("(s.min_cgpa IS NULL OR s.min_cgpa <= ?)", filters.minCgpa);
  if (filters.maxIncome !== undefined) add("(s.max_income IS NULL OR s.max_income >= ?)", filters.maxIncome);
  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`(s.name ILIKE $${values.length} OR s.description ILIKE $${values.length})`);
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
  const offset = (page - 1) * limit;
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const count = await db.query(`SELECT COUNT(*)::int AS total FROM scholarships s ${clause}`, values);
  const result = await db.query(
    `SELECT s.* FROM scholarships s ${clause} ORDER BY s.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset]
  );
  return { items: result.rows.map(normalize), pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) } };
}

async function getById(id) {
  const result = await db.query("SELECT * FROM scholarships WHERE id = $1", [id]);
  return result.rows[0] ? normalize(result.rows[0]) : null;
}

async function create(data) {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO scholarships
       (name, description, category, amount, min_cgpa, max_income, department, deadline, total_slots, status, eligibility_criteria, required_documents)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'open'),COALESCE($11,'[]'::jsonb),COALESCE($12,'[]'::jsonb))
       RETURNING *`,
      [data.name.trim(), data.description, data.category, data.amount, data.min_cgpa ?? null,
       data.max_income ?? null, data.department ?? null, data.deadline, data.total_slots ?? null,
       data.status, JSON.stringify(data.eligibility_criteria || []), JSON.stringify(data.required_documents || [])]
    );
    await client.query("COMMIT");
    return normalize(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function update(id, data) {
  const current = await getById(id);
  if (!current) return null;
  const merged = { ...current, ...data };
  const result = await db.query(
    `UPDATE scholarships SET
      name=$1, description=$2, category=$3, amount=$4, min_cgpa=$5, max_income=$6,
      department=$7, deadline=$8, total_slots=$9, status=$10,
      eligibility_criteria=$11::jsonb, required_documents=$12::jsonb, updated_at=NOW()
     WHERE id=$13 RETURNING *`,
    [merged.name, merged.description, merged.category, merged.amount, merged.min_cgpa,
     merged.max_income, merged.department, merged.deadline, merged.total_slots, merged.status,
     JSON.stringify(merged.eligibility_criteria || []), JSON.stringify(merged.required_documents || []), id]
  );
  return normalize(result.rows[0]);
}

async function updateStatus(id, status) {
  const result = await db.query(
    "UPDATE scholarships SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
    [status, id]
  );
  return result.rows[0] ? normalize(result.rows[0]) : null;
}

async function remove(id) {
  const result = await db.query("DELETE FROM scholarships WHERE id=$1 RETURNING id", [id]);
  return result.rowCount > 0;
}

module.exports = { list, getById, create, update, updateStatus, remove };
