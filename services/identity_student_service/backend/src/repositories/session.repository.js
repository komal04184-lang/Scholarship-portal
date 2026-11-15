const { query } = require("../db/db");

class SessionRepository {
  static async createSession(userId, refreshTokenHash, expiresAt) {
    const sql = `
      INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, expires_at, created_at
    `;
    const res = await query(sql, [userId, refreshTokenHash, expiresAt]);
    return res.rows[0];
  }

  static async findActiveSession(refreshTokenHash) {
    const sql = `
      SELECT id, user_id, expires_at, revoked, created_at
      FROM user_sessions
      WHERE refresh_token_hash = $1 AND revoked = false AND expires_at > NOW()
    `;
    const res = await query(sql, [refreshTokenHash]);
    return res.rows[0] || null;
  }

  static async findAnySession(refreshTokenHash) {
    const sql = `
      SELECT id, user_id, expires_at, revoked, created_at
      FROM user_sessions
      WHERE refresh_token_hash = $1
      LIMIT 1
    `;
    const res = await query(sql, [refreshTokenHash]);
    return res.rows[0] || null;
  }

  static async revokeSession(refreshTokenHash) {
    const sql = `
      UPDATE user_sessions
      SET revoked = true
      WHERE refresh_token_hash = $1
      RETURNING id
    `;
    const res = await query(sql, [refreshTokenHash]);
    return res.rowCount > 0;
  }

  static async revokeAllUserSessions(userId) {
    const sql = `
      UPDATE user_sessions
      SET revoked = true
      WHERE user_id = $1
    `;
    await query(sql, [userId]);
  }
}

module.exports = SessionRepository;

