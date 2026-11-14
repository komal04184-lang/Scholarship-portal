const { query } = require('../config/database');

class AuditRepository {
  /**
   * Record an action in the application_audit_logs table
   */
  static async recordLog(applicationId, actorUserId, actorRole, action, description, metadata = {}, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;
    const sql = `
      INSERT INTO application_audit_logs (
        application_id, actor_user_id, actor_role, action, description, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;

    try {
      const res = await executor(sql, [
        applicationId || null,
        actorUserId ? String(actorUserId) : null,
        actorRole ? String(actorRole) : 'SYSTEM',
        String(action),
        description ? String(description) : null,
        JSON.stringify(metadata || {}),
      ]);
      return res.rows[0];
    } catch (err) {
      console.warn(`Audit log warning: ${err.message}`);
      return null;
    }
  }

  /**
   * Retrieve audit logs for an application
   */
  static async getByApplicationId(applicationId) {
    const sql = `
      SELECT * FROM application_audit_logs
      WHERE application_id::TEXT = $1::TEXT
      ORDER BY created_at DESC;
    `;
    const res = await query(sql, [String(applicationId)]);
    return res.rows;
  }
}

module.exports = AuditRepository;

