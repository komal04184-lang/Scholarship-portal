const { query } = require('../config/db');

class ReviewerModel {
  static async findAll() {
    const res = await query(
      `SELECT r.reviewer_id, r.name, r.email, r.department, r.designation, r.status, r.created_at,
              (SELECT COUNT(*) FROM application a WHERE a.reviewer_id = r.reviewer_id) as assigned_count
       FROM reviewer r
       ORDER BY r.created_at DESC`
    );
    return res.rows;
  }

  static async findById(id) {
    const res = await query(
      `SELECT reviewer_id, name, email, department, designation, status, created_at
       FROM reviewer WHERE reviewer_id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findByEmail(email) {
    const res = await query(
      `SELECT reviewer_id, name, email, password, password_hash, department, designation, status, created_at
       FROM reviewer WHERE email = $1`,
      [email]
    );
    return res.rows[0] || null;
  }

  static async create({ name, email, password, passwordHash, department, designation }) {
    const res = await query(
      `INSERT INTO reviewer (name, email, password, password_hash, department, designation, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW())
       RETURNING reviewer_id, name, email, department, designation, status, created_at`,
      [name, email, password, passwordHash || password, department || null, designation || null]
    );
    return res.rows[0];
  }

  static async update(id, { name, department, designation, status }) {
    const res = await query(
      `UPDATE reviewer
       SET name = COALESCE($1, name),
           department = COALESCE($2, department),
           designation = COALESCE($3, designation),
           status = COALESCE($4, status)
       WHERE reviewer_id = $5
       RETURNING reviewer_id, name, email, department, designation, status`,
      [name, department, designation, status, id]
    );
    return res.rows[0] || null;
  }
}

module.exports = ReviewerModel;
