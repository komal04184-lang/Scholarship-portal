const { query } = require("../db/db");

class TokenRepository {
  static async createPasswordResetToken(userId, tokenHash, expiresAt) {
    const sql = `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, token_hash, expires_at
    `;
    const res = await query(sql, [userId, tokenHash, expiresAt]);
    return res.rows[0];
  }

  static async findValidPasswordResetToken(tokenHash) {
    const sql = `
      SELECT id, user_id, expires_at, used_at
      FROM password_reset_tokens
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
    `;
    const res = await query(sql, [tokenHash]);
    return res.rows[0] || null;
  }

  static async markPasswordResetTokenUsed(tokenHash) {
    const sql = `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE token_hash = $1
    `;
    await query(sql, [tokenHash]);
  }

  static async createEmailVerificationToken(userId, tokenHash, expiresAt) {
    const sql = `
      INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, token_hash, expires_at
    `;
    const res = await query(sql, [userId, tokenHash, expiresAt]);
    return res.rows[0];
  }

  static async findValidEmailVerificationToken(tokenHash) {
    const sql = `
      SELECT id, user_id, expires_at, verified_at
      FROM email_verification_tokens
      WHERE token_hash = $1 AND verified_at IS NULL AND expires_at > NOW()
    `;
    const res = await query(sql, [tokenHash]);
    return res.rows[0] || null;
  }

  static async markEmailTokenVerified(tokenHash) {
    const sql = `
      UPDATE email_verification_tokens
      SET verified_at = NOW()
      WHERE token_hash = $1
    `;
    await query(sql, [tokenHash]);
  }
}

module.exports = TokenRepository;

