const { query } = require("../db/db");

class UserRepository {
  static async createUser({ username, email, password_hash, role = "student" }, client = null) {
    const q = client ? client.query.bind(client) : query;
    const sql = `
      INSERT INTO users (username, email, password_hash, role, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING id, username, email, role, status, email_verified, created_at, updated_at
    `;
    const res = await q(sql, [username.trim(), email.trim().toLowerCase(), password_hash, role]);
    return res.rows[0];
  }

  static async findByEmail(email) {
    const sql = `
      SELECT id, username, email, password_hash, role, status, email_verified, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
    `;
    const res = await query(sql, [email.trim()]);
    return res.rows[0] || null;
  }

  static async findByUsername(username) {
    const sql = `
      SELECT id, username, email, password_hash, role, status, email_verified, created_at, updated_at
      FROM users
      WHERE LOWER(username) = LOWER($1)
    `;
    const res = await query(sql, [username.trim()]);
    return res.rows[0] || null;
  }

  static async findById(id) {
    const sql = `
      SELECT id, username, email, role, status, email_verified, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  static async findByIdWithPassword(id) {
    const sql = `
      SELECT id, username, email, password_hash, role, status, email_verified, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  static async updatePassword(id, password_hash) {
    const sql = `
      UPDATE users
      SET password_hash = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, username, email, role
    `;
    const res = await query(sql, [id, password_hash]);
    return res.rows[0] || null;
  }

  static async updateStatus(id, status) {
    const sql = `
      UPDATE users
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, username, email, role, status, updated_at
    `;
    const res = await query(sql, [id, status]);
    return res.rows[0] || null;
  }

  static async updateRole(id, role) {
    const sql = `
      UPDATE users
      SET role = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, username, email, role, status, updated_at
    `;
    const res = await query(sql, [id, role]);
    return res.rows[0] || null;
  }

  static async markEmailVerified(id) {
    const sql = `
      UPDATE users
      SET email_verified = true, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, email_verified
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  static async listUsers({ page = 1, limit = 20, role, status, search }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (role) {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`u.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(u.username) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*) AS total FROM users u ${whereClause}`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    params.push(limit);
    params.push(offset);
    const sql = `
      SELECT u.id, u.username, u.email, u.role, u.status, u.email_verified, u.created_at, u.updated_at,
             sp.enrollment_no, sp.phone, sp.institution_name, sp.course, sp.profile_complete
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const res = await query(sql, params);
    return {
      users: res.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async countByRole(role) {
    const sql = `SELECT COUNT(*) AS count FROM users WHERE role = $1`;
    const res = await query(sql, [role]);
    return parseInt(res.rows[0].count, 10);
  }

  static async countTotal() {
    const sql = `SELECT COUNT(*) AS count FROM users`;
    const res = await query(sql);
    return parseInt(res.rows[0].count, 10);
  }
}

module.exports = UserRepository;

