const { query } = require('../config/database');

class AnswerRepository {
  /**
   * Save or update form answers for an application
   * @param {string} applicationId
   * @param {Array<{ section_key?: string, question_key: string, question_label?: string, answer_value: any }>} answers
   * @param {object} dbClient
   */
  static async saveAnswers(applicationId, answers, dbClient = null) {
    if (!Array.isArray(answers) || answers.length === 0) return [];
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;

    const saved = [];
    for (const ans of answers) {
      const sql = `
        INSERT INTO application_form_answers (
          application_id, section_key, question_key, question_label, answer_value, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (application_id, question_key) DO UPDATE
        SET section_key = EXCLUDED.section_key,
            question_label = COALESCE(EXCLUDED.question_label, application_form_answers.question_label),
            answer_value = EXCLUDED.answer_value,
            updated_at = NOW()
        RETURNING *;
      `;

      const res = await executor(sql, [
        applicationId,
        ans.section_key || 'general',
        String(ans.question_key),
        ans.question_label || null,
        JSON.stringify(ans.answer_value !== undefined ? ans.answer_value : null),
      ]);
      saved.push(res.rows[0]);
    }

    return saved;
  }

  /**
   * Get all form answers for an application
   */
  static async getAnswers(applicationId) {
    const sql = `
      SELECT * FROM application_form_answers
      WHERE application_id = $1
      ORDER BY section_key, created_at ASC;
    `;
    const res = await query(sql, [applicationId]);
    return res.rows;
  }

  /**
   * Delete answers for an application
   */
  static async deleteAnswers(applicationId, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;
    const sql = `DELETE FROM application_form_answers WHERE application_id = $1;`;
    await executor(sql, [applicationId]);
  }
}

module.exports = AnswerRepository;

