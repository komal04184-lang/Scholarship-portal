const { query } = require('../config/database');

class StatusRepository {
  /**
   * Append a status change event to the audit history
   */
  static async addHistory(data, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;

    const sql = `
      INSERT INTO application_status (
        application_id,
        status,
        previous_status,
        new_status,
        comment,
        remarks,
        changed_by,
        changed_by_role,
        changed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *;
    `;

    const statusVal = data.new_status || data.status;
    const commentVal = data.remarks || data.comment || '';

    const res = await executor(sql, [
      data.application_id,
      statusVal,
      data.previous_status || null,
      statusVal,
      commentVal,
      commentVal,
      String(data.changed_by || 'SYSTEM'),
      data.changed_by_role || null,
    ]);

    return res.rows[0];
  }

  /**
   * Retrieve complete status audit history for an application
   */
  static async getByApplicationId(applicationId) {
    const sql = `
      SELECT status_id,
             application_id,
             status,
             previous_status,
             new_status,
             COALESCE(remarks, comment) AS comment,
             COALESCE(remarks, comment) AS remarks,
             changed_by,
             changed_by_role,
             changed_at
      FROM application_status
      WHERE application_id::TEXT = $1::TEXT
      ORDER BY changed_at ASC;
    `;
    const res = await query(sql, [String(applicationId)]);
    return res.rows;
  }
}

module.exports = StatusRepository;

