const { query } = require('../config/database');

class RequirementRepository {
  /**
   * Snapshot document requirements for an application
   */
  static async createRequirements(applicationId, requirements, dbClient = null) {
    if (!Array.isArray(requirements) || requirements.length === 0) return [];
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;

    const saved = [];
    for (const req of requirements) {
      const sql = `
        INSERT INTO application_document_requirements (
          application_id, requirement_code, requirement_name, description, is_mandatory, allowed_mime_types, max_file_size_bytes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;

      const res = await executor(sql, [
        applicationId,
        req.requirement_code || req.name?.toLowerCase().replace(/\s+/g, '_') || 'DOC',
        req.requirement_name || req.name || 'Required Document',
        req.description || null,
        req.is_mandatory !== false,
        JSON.stringify(req.allowed_mime_types || ['application/pdf', 'image/jpeg', 'image/png']),
        req.max_file_size_bytes || 10485760,
      ]);
      saved.push(res.rows[0]);
    }

    return saved;
  }

  /**
   * Get document requirements for an application
   */
  static async getByApplicationId(applicationId) {
    const sql = `
      SELECT * FROM application_document_requirements
      WHERE application_id = $1
      ORDER BY created_at ASC;
    `;
    const res = await query(sql, [applicationId]);
    return res.rows;
  }
}

module.exports = RequirementRepository;

