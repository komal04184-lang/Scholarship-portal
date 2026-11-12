const { query, getMongoDb } = require('../config/database');
const { generateApplicationNumber } = require('../utils/application-id');

class ApplicationRepository {
  /**
   * Find existing application by student and scholarship
   */
  static async findExisting(studentId, scholarshipId) {
    const sql = `
      SELECT * FROM application
      WHERE student_id::TEXT = $1::TEXT AND scholarship_id::TEXT = $2::TEXT
      LIMIT 1;
    `;
    const res = await query(sql, [String(studentId), String(scholarshipId)]);
    return res.rows[0] || null;
  }

  /**
   * Create new application in database
   */
  static async create(data, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;

    const sql = `
      INSERT INTO application (
        student_id,
        scholarship_id,
        status,
        statement,
        sop,
        academic_year,
        submitted_at,
        updated_at,
        application_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), CURRENT_DATE)
      RETURNING *;
    `;

    const status = data.status || 'SUBMITTED';
    const statement = data.statement || data.sop || '';
    const sop = data.sop || data.statement || '';
    const academicYear = data.academic_year || '2026-2027';

    const res = await executor(sql, [
      data.student_id,
      data.scholarship_id,
      status,
      statement,
      sop,
      academicYear,
    ]);

    const created = res.rows[0];

    // Assign application_number
    const appNumber = generateApplicationNumber(created.application_id);
    await executor(
      `UPDATE application SET application_number = $1 WHERE application_id = $2`,
      [appNumber, created.application_id]
    );
    created.application_number = appNumber;

    return created;
  }

  /**
   * Find application by ID
   */
  static async findById(applicationId) {
    const sql = `
      SELECT a.*,
             COUNT(d.application_document_id) AS document_count
      FROM application a
      LEFT JOIN application_document d ON a.application_id = d.application_id
      WHERE a.application_id::TEXT = $1::TEXT OR a.application_number = $1::TEXT
      GROUP BY a.application_id;
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
             COUNT(d.application_document_id) AS document_count
      FROM application a
      LEFT JOIN application_document d ON a.application_id = d.application_id
      WHERE a.student_id::TEXT = $1::TEXT
    `;
    const params = [String(studentId)];

    if (options.status) {
      params.push(options.status);
      sql += ` AND a.status = $${params.length}`;
    }

    sql += ` GROUP BY a.application_id ORDER BY a.submitted_at DESC`;

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
    const countSql = `SELECT COUNT(*) FROM application a ${whereSql};`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Data query
    let dataSql = `
      SELECT a.*,
             COUNT(d.application_document_id) AS document_count
      FROM application a
      LEFT JOIN application_document d ON a.application_id = d.application_id
      ${whereSql}
      GROUP BY a.application_id
      ORDER BY a.submitted_at ${options.sort === 'ASC' ? 'ASC' : 'DESC'}
    `;

    const limit = options.limit || 10;
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
   * Update application fields
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
    if (updates.last_updated_by !== undefined) {
      fields.push(`last_updated_by = $${idx++}`);
      values.push(updates.last_updated_by);
    }

    fields.push(`updated_at = NOW()`);
    values.push(String(applicationId));

    const sql = `
      UPDATE application
      SET ${fields.join(', ')}
      WHERE application_id::TEXT = $${idx}::TEXT
      RETURNING *;
    `;

    const res = await executor(sql, values);
    return res.rows[0] || null;
  }

  /**
   * Update application status
   */
  static async updateStatus(applicationId, newStatus, dbClient = null) {
    const executor = dbClient ? dbClient.query.bind(dbClient) : query;
    const sql = `
      UPDATE application
      SET status = $1, updated_at = NOW()
      WHERE application_id::TEXT = $2::TEXT
      RETURNING *;
    `;
    const res = await executor(sql, [newStatus, String(applicationId)]);
    return res.rows[0] || null;
  }

  /**
   * Idempotency handling
   */
  static async getIdempotencyRecord(key) {
    const sql = `
      SELECT * FROM application_idempotency
      WHERE idempotency_key = $1 AND expires_at > NOW()
      LIMIT 1;
    `;
    const res = await query(sql, [key]);
    return res.rows[0] || null;
  }

  static async saveIdempotencyRecord(key, studentId, requestHash, status, body) {
    const sql = `
      INSERT INTO application_idempotency (
        idempotency_key, student_id, request_hash, response_status, response_body
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (idempotency_key) DO UPDATE
      SET response_status = EXCLUDED.response_status,
          response_body = EXCLUDED.response_body;
    `;
    await query(sql, [key, String(studentId), requestHash || null, status, JSON.stringify(body)]);
  }

  /**
   * MongoDB Application Snapshot storage
   */
  static async saveSnapshot(applicationId, snapshotPayload) {
    const db = getMongoDb();
    if (!db) return null;
    try {
      const collection = db.collection('application_snapshots');
      await collection.updateOne(
        { application_id: String(applicationId) },
        {
          $set: {
            application_id: String(applicationId),
            payload: snapshotPayload,
            captured_at: new Date(),
          },
        },
        { upsert: true }
      );
      return true;
    } catch (err) {
      return null;
    }
  }

  static async getSnapshot(applicationId) {
    const db = getMongoDb();
    if (!db) return null;
    try {
      const collection = db.collection('application_snapshots');
      return await collection.findOne({ application_id: String(applicationId) });
    } catch (err) {
      return null;
    }
  }
}

module.exports = ApplicationRepository;

