const { query } = require('../config/database');

class StatusRepository {
  /**
   * Append a status change event to the audit history (application_status_history table)
   */
  static async addHistory(data, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;

    const sql = `
      INSERT INTO application_status_history (
        application_id,
        previous_status,
        new_status,
        changed_by_user_id,
        changed_by_role,
        reason,
        changed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *,
                id AS status_id,
                new_status AS status,
                reason AS comment,
                reason AS remarks,
                changed_by_user_id AS changed_by;
    `;

    const statusVal = data.new_status || data.status;
    const commentVal = data.remarks || data.comment || data.reason || '';

    const res = await executor(sql, [
      data.application_id,
      data.previous_status || null,
      statusVal,
      String(data.changed_by_user_id || data.changed_by || 'SYSTEM'),
      data.changed_by_role || null,
      commentVal,
    ]);

    return res.rows[0];
  }

  /**
   * Retrieve complete status audit history for an application
   */
  static async getByApplicationId(applicationId) {
    const sql = `
      SELECT id,
             id AS status_id,
             application_id,
             new_status AS status,
             previous_status,
             new_status,
             reason AS comment,
             reason AS remarks,
             changed_by_user_id AS changed_by,
             changed_by_role,
             changed_at
      FROM application_status_history
      WHERE application_id::TEXT = $1::TEXT
      ORDER BY changed_at ASC;
    `;
    const res = await query(sql, [String(applicationId)]);
    return res.rows;
  }
}

module.exports = StatusRepository;
