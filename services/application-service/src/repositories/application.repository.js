const { query } = require('../config/database');
const { generateApplicationNumber } = require('../utils/application-id');

class ApplicationRepository {
  /**
   * Find existing application by student and scholarship
   */
  static async findExisting(studentId, scholarshipId) {
    const sql = `
      SELECT a.*,
             a.id AS application_id
      FROM applications a
      WHERE a.student_id::TEXT = $1::TEXT AND a.scholarship_id::TEXT = $2::TEXT
      LIMIT 1;
    `;
    const res = await query(sql, [String(studentId), String(scholarshipId)]);
    return res.rows[0] || null;
  }

  /**
   * Create new application in database (applications table)
   */
  static async create(data, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;

    const status = data.status || 'SUBMITTED';
    const statement = data.statement || data.sop || '';
    const sop = data.sop || data.statement || '';
    const academicYear = data.academic_year || '2026-2027';
    const metadata = data.metadata || {};
    const submittedAt = status === 'SUBMITTED' ? new Date() : null;

    // First generate a temporary application number
    const tempNum = `APP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const sql = `
      INSERT INTO applications (
        application_number,
        student_id,
        scholarship_id,
        status,
        academic_year,
        statement,
        sop,
        metadata,
        submitted_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *, id AS application_id;
    `;

    const res = await executor(sql, [
      tempNum,
      String(data.student_id),
      String(data.scholarship_id),
      status,
      academicYear,
      statement,
      sop,
      JSON.stringify(metadata),
      submittedAt,
    ]);

    const created = res.rows[0];

    // Compute formatted application number based on row or UUID
    const finalAppNumber = `APP-${new Date().getFullYear()}-${created.id.substring(0, 8).toUpperCase()}`;
    await executor(
      `UPDATE applications SET application_number = $1 WHERE id = $2`,
      [finalAppNumber, created.id]
    );
    created.application_number = finalAppNumber;

    return created;
  }

  /**
   * Find application by ID or application_number
   */
  static async findById(applicationId) {
    const sql = `
      SELECT a.*,
             a.id AS application_id,
             COUNT(d.id) AS document_count
      FROM applications a
      LEFT JOIN application_documents d ON a.id = d.application_id AND d.is_current = true
      WHERE a.id::TEXT = $1::TEXT OR a.application_number = $1::TEXT
      GROUP BY a.id;
    `;
    const res = await query(sql, [String(applicationId)]);
    return res.rows[0] || null;
  }

  /**
   * Find all applications for a student
   */
  static async findByStudentId(studentId, options = {}) {
    let sql = `
      SELECT a.*,
             a.id AS application_id,
             COUNT(d.id) AS document_count
      FROM applications a
      LEFT JOIN application_documents d ON a.id = d.application_id AND d.is_current = true
      WHERE a.student_id::TEXT = $1::TEXT
    `;
    const params = [String(studentId)];

    if (options.status) {
      params.push(options.status);
      sql += ` AND a.status = $${params.length}`;
    }

    sql += ` GROUP BY a.id ORDER BY a.created_at DESC`;

    if (options.limit) {
      params.push(options.limit);
      sql += ` LIMIT $${params.length}`;
      if (options.offset) {
        params.push(options.offset);
        sql += ` OFFSET $${params.length}`;
      }
    }

    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * Find all applications (for Admin/Reviewer listing)
   */
  static async findAll(filters = {}, options = {}) {
    let whereClauses = [];
    let params = [];

    if (filters.status) {
      params.push(filters.status);
      whereClauses.push(`a.status = $${params.length}`);
    }

    if (filters.scholarship_id) {
      params.push(filters.scholarship_id);
      whereClauses.push(`a.scholarship_id::TEXT = $${params.length}::TEXT`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count query
    const countSql = `SELECT COUNT(*) FROM applications a ${whereSql};`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Data query
    let dataSql = `
      SELECT a.*,
             a.id AS application_id,
             COUNT(d.id) AS document_count
      FROM applications a
      LEFT JOIN application_documents d ON a.id = d.application_id AND d.is_current = true
      ${whereSql}
      GROUP BY a.id
      ORDER BY a.created_at ${options.sort === 'ASC' ? 'ASC' : 'DESC'}
    `;

    const limit = options.limit || 20;
    const offset = options.offset || 0;

    params.push(limit);
    dataSql += ` LIMIT $${params.length}`;
    params.push(offset);
    dataSql += ` OFFSET $${params.length}`;

    const res = await query(dataSql, params);

    return {
      total,
      limit,
      offset,
      applications: res.rows,
    };
  }

  /**
   * Update application fields (statement, sop, academic_year, metadata)
   */
  static async update(applicationId, updates, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.statement !== undefined) {
      fields.push(`statement = $${idx++}`);
      values.push(updates.statement);
    }
    if (updates.sop !== undefined) {
      fields.push(`sop = $${idx++}`);
      values.push(updates.sop);
    }
    if (updates.academic_year !== undefined) {
      fields.push(`academic_year = $${idx++}`);
      values.push(updates.academic_year);
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${idx++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    fields.push(`updated_at = NOW()`);
    values.push(String(applicationId));

    const sql = `
      UPDATE applications
      SET ${fields.join(', ')}
      WHERE id::TEXT = $${idx}::TEXT OR application_number = $${idx}::TEXT
      RETURNING *, id AS application_id;
    `;

    const res = await executor(sql, values);
    return res.rows[0] || null;
  }

  /**
   * Update application status
   */
  static async updateStatus(applicationId, newStatus, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;
    
    let extraFields = '';
    if (newStatus === 'SUBMITTED') {
      extraFields = ', submitted_at = NOW()';
    } else if (newStatus === 'WITHDRAWN') {
      extraFields = ', withdrawn_at = NOW()';
    }

    const sql = `
      UPDATE applications
      SET status = $1, updated_at = NOW() ${extraFields}
      WHERE id::TEXT = $2::TEXT OR application_number = $2::TEXT
      RETURNING *, id AS application_id;
    `;
    const res = await executor(sql, [newStatus, String(applicationId)]);
    return res.rows[0] || null;
  }

  /**
   * Idempotency record storage (idempotency_keys table in application_db)
   */
  static async getIdempotencyRecord(key) {
    const sql = `
      SELECT * FROM idempotency_keys
      WHERE idempotency_key = $1 AND expires_at > NOW()
      LIMIT 1;
    `;
    const res = await query(sql, [key]);
    return res.rows[0] || null;
  }

  static async saveIdempotencyRecord(key, userId, requestHash, status, body) {
    const sql = `
      INSERT INTO idempotency_keys (
        idempotency_key, user_id, request_hash, response_status, response_body, created_at, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '24 hours')
      ON CONFLICT (idempotency_key) DO UPDATE
      SET response_status = EXCLUDED.response_status,
          response_body = EXCLUDED.response_body;
    `;
    try {
      await query(sql, [
        key,
        String(userId),
        requestHash || 'HASH',
        status,
        JSON.stringify(body || {}),
      ]);
    } catch (e) {
      console.warn('Idempotency key save error:', e.message);
    }
  }
}

module.exports = ApplicationRepository;
