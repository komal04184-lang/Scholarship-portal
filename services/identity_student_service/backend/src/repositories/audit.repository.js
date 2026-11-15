const { query } = require("../db/db");

class AuditRepository {
  static async logAction(userId, action, description = null, ipAddress = null) {
    try {
      const sql = `
        INSERT INTO user_audit_logs (user_id, action, description, ip_address)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;
      await query(sql, [userId || null, action, description, ipAddress]);
    } catch (err) {
      console.warn("Failed to write audit log:", err.message);
    }
  }

  static async getLogsByUser(userId, limit = 50) {
    const sql = `
      SELECT id, action, description, ip_address, created_at
      FROM user_audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const res = await query(sql, [userId, limit]);
    return res.rows;
  }
}

module.exports = AuditRepository;

